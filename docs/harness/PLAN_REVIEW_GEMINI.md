---
role: reference
portability: project-specific
---

# Plan Review via Gemini (MCP)

Third-party LLM review of plan/design documents. Implemented as the
`gemini-review` MCP server (`.claude/mcp/gemini-review/`), exposed to Claude
Code as a single tool: `review_plan({ path, focus? })`.

## When to use
- After a Stage 1/2 design doc (`docs/feat_*_s{1,2}.md`) is drafted, before
  handoff to implementation.
- After Claude finishes a plan in Plan Mode (`/root/.claude/plans/*.md`) and
  you want a second-LLM sanity check before approving.
- For ad-hoc design memos (`.md` / `.txt`) up to 64 KB.

Not for code review (use `/review`), security review (use `/security-review`),
or PR-level review (use `/ultrareview`).

## Tier classification
**Medium.** External network call to a third-party API, new local secret,
session-boot path change (MCP server), and external data egress requiring
disclosure. Per `FEATURE_DIFFICULTY_TIERS.md`.

## Quality gate mapping
| Axis | Evidence |
|---|---|
| Privacy | External-egress disclosure in this doc + `CLAUDE.md`. Plan body is forwarded to Google Gemini; user must vet content first. Aggregate-only input data rule unaffected (server never reads input events). |
| Security | API key stored at `.claude/.gemini-key`, gitignored, server enforces `chmod 600` on read. Fallback `GEMINI_API_KEY` env. Path argument is normalized via `path.resolve` and constrained to `.md`/`.markdown`/`.txt`. No shell invocation. |
| Recovery | Missing key, missing prompt template, network failure, non-200 response, and empty Gemini response each return a human-readable error string via the MCP `isError` channel. Server process stays alive across failures. |
| Lifecycle | MCP stdio server is spawned and reaped by Claude Code per session. No timers, listeners, workers, or filesystem watches. |
| UX | Tool description states data is sent to Google. README and `CLAUDE.md` repeat the warning. `focus` parameter lets the caller bias the review. |
| Performance | Single fetch per call. 64 KB input cap, 4096 output-token cap. No background work. |

## Data inventory (delta-only)
| Field | Source | Persistence | Egress | Notes |
|---|---|---|---|---|
| Plan markdown body | Caller-supplied path | Not persisted | **Sent to Google Gemini** | Caller must vet before invoking. |
| Gemini API key | `.claude/.gemini-key` or `GEMINI_API_KEY` | Local file (chmod 600) or env | Outbound `?key=` query param to `generativelanguage.googleapis.com` | Gitignored. Never logged. |
| Token usage counts | Gemini response `usageMetadata` | Not persisted | Stderr only | `model=...` `tokens in=N out=N`. No content. |

## Disabling
Remove the `gemini-review` entry from `.mcp.json` and restart Claude Code. To
keep the server registered but inert, delete the key file — every call returns
an error until a key is restored.

## Failure modes & operator response
| Symptom | Cause | Action |
|---|---|---|
| `No Gemini API key found` | Missing key file and env | Create `.claude/.gemini-key` (chmod 600) or export `GEMINI_API_KEY`. |
| `Refusing to read … group/other-readable` | Key file permissions too loose | `chmod 600 .claude/.gemini-key`. |
| `Unsupported extension` | Non-text path | Convert to `.md` / `.txt` or skip. |
| `File too large` | Plan over 64 KB | Trim or split the plan. |
| `Gemini API 4xx` | Bad key, quota, content policy | Inspect error body. Rotate key or reduce content. |
| `Gemini API 5xx` | Upstream issue | Retry. Server already does one auto-retry on network exception. |

## Privacy non-negotiables — no exception requested
This feature does not collect, store, log, or transmit raw key values, typed
strings, click coordinates, cursor paths, window titles, or screenshots. It
only forwards explicitly user-supplied plan text.

## Verification checklist
- [ ] `.mcp.json` lists `gemini-review`; `/mcp` reports `connected` after
      restart.
- [ ] `chmod 600 .claude/.gemini-key`; reading with looser perms is rejected.
- [ ] Calling `review_plan` on a sample `_s2.md` returns a verdict + findings.
- [ ] Negative cases (missing path, empty file, oversized file, `.bin`
      extension, missing key) each return a clear error.
- [ ] `npm run hooks:test` stays green (no shared scripts touched).
- [ ] `git status` shows the key file as ignored.

## Feature Quality Note

Filled instance of `FEATURE_QUALITY_NOTE_TEMPLATE.md` for handoff.

### Feature
- **Name**: Gemini plan-review MCP server (`gemini-review`)
- **Related request**: Add a "plan review by Gemini" capability to Claude.
- **Related ADR**: none.
- **Quality gate matrix**: see "Quality gate mapping" table above.
- **Data inventory**: see "Data inventory (delta-only)" table above.
- **Difficulty tier**: Medium.
- **Tier rationale**: external network call to a third-party API, new local secret, session-boot path change (MCP), explicit external-egress disclosure required.
- **Tier changes during implementation**: none.

### Requirement Evidence
| Acceptance case | Evidence | Result |
| --- | --- | --- |
| Server registered and discoverable | `.mcp.json` lists `gemini-review`; manual `/mcp` check after restart. | Pending operator verification |
| `review_plan` returns Gemini text on a valid `.md` | `index.mjs::reviewPlan` round-trip; manual call on `/root/.claude/plans/*.md`. | Pending operator verification |
| Rejects bad inputs | `index.mjs` guards extension allowlist, `stat()` existence/regular-file/size; unit-tested via direct invocation. | Pass (manual) |
| Missing key returns clear error, server stays alive | `loadApiKey()` throws human-readable error; outer `try/catch` returns `isError` content without crashing the process. | Pass (code review) |
| Existing hooks suite unaffected | `npm run hooks:test` → 22/22 pass. | Pass |

### UI/UX Evidence
- **Reviewed checklist**: tool description names Google as recipient; CLI surface is the MCP tool only (no new UI in the desktop app).
- **States covered**: success, missing key, bad path, oversized file, unsupported extension, upstream 4xx/5xx, empty Gemini response.
- **User-facing copy changes**: none in the desktop app. New disclosure copy in `CLAUDE.md` and `README.md`.
- **Accessibility notes**: not applicable (no GUI surface).
- **Remaining UX risk**: caller can still send sensitive plan content. Mitigated only by docs and operator discipline.

### Resident Stability Evidence
- **Lifecycle cleanup checked**: stdio process is spawned and reaped by Claude Code per session. No timers, listeners, watchers, sockets, or filesystem caches.
- **Background/resume checked**: not applicable (no background work; tool runs synchronously per call).
- **Sleep/wake checked**: stateless; next call after wake re-executes from scratch.
- **Soak or sampler evidence**: not applicable for a per-call tool.
- **Remaining stability risk**: none identified.

### Recovery and Data Integrity Evidence
- **Degraded mode**: no key → every `review_plan` call returns an error message; server remains responsive.
- **Retry or pause path**: one automatic retry on `fetch` exception; no retry on HTTP error status.
- **Restart/interrupted-write evidence**: not applicable (no persisted state).
- **Migration or rollback evidence**: not applicable (no schema). Rollback = remove `.mcp.json` entry.
- **Double-counting prevention**: not applicable (no aggregation, no persisted counters).

### Privacy Evidence
- **Data collected**: caller-supplied plan markdown body (in-memory only).
- **Aggregation level**: not applicable; the file is forwarded verbatim.
- **Raw input fields present**: No (no keyboard/mouse/window data touched).
- **Privacy scrubber result**: scrubber not applicable to this artifact (the source file is operator-curated text, not a captured artifact); 64 KB cap limits accidental egress volume; CLAUDE.md and README warn against sending sensitive plans.
- **Retention/deletion documented**: nothing persisted locally. Google retention follows Gemini API terms; documented in disclosure.

### Security and Environment Evidence
- **Secret/path/token scrub result**: API key never logged; only `model=` and token counts written to stderr; key transmitted only as outbound query param to the documented endpoint.
- **External dependency or hook trust review**: single npm dep (`@modelcontextprotocol/sdk`) installed in isolated `node_modules` under `.claude/mcp/gemini-review/`. Endpoint hard-coded to `generativelanguage.googleapis.com/v1beta`. No shell invocation; no `child_process`.
- **Offline/online, battery, display, timezone, or locale evidence**: offline → fetch fails → error string returned; no battery/display/locale dependencies.
- **Accessibility or time-semantics notes**: none.

### Operations
- **Failure artifacts**: stderr line per call (`[gemini-review] model=… tokens in=N out=N`). No file artifacts.
- **Rollback or mitigation**: delete the `gemini-review` entry from `.mcp.json` and restart, or delete `.claude/.gemini-key`.
- **Pause point**: operator decision before each invocation (manual call required).
- **Follow-up**: optional `/plan-review` slash-command wrapper if usage proves frequent; deferred.
- **Deferred evidence expiry**: operator verification of `/mcp` connection and a real Gemini round-trip pending until a key is provisioned.

### Stop Conditions Hit
- **Trigger**: pre-existing JSON syntax error in root `package.json` (unrelated merge artifact) blocked `npm run hooks:test`.
  - **Decision**: bypassed via direct `node scripts/test-hooks.mjs` for initial verification, then fixed `package.json` in a follow-up commit so `npm run hooks:test` works again.
  - **Owner of follow-up**: addressed in this branch.
