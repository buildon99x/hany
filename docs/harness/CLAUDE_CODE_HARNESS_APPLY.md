---
role: reference
portability: project-specific
---

# Claude Code Harness Apply Guide

This project includes a Claude Code-ready harness configuration in `.claude/`.

## What Is Installed
- `.claude/settings.json`: project hooks for session context, prompt context, privacy guard, command guard, post-edit quality reminders, stop checks, pre-compact context, subagent handoff, Phase commit effort collection, harness-loop cost tracking, and worktree node_modules linking.
- `.claude/skills/`: project skills that Claude Code can discover and invoke. All skills use **directory form** (`*/SKILL.md`) with frontmatter `name`/`description`: `design-stage`, `desktop-resident-stability`, `feature-quality-gate`, `frontend-design`, `harness-entry`, `harness-workflow-control`, `learn-record`, `pr-pruner`, `pr-review-fix`, `privacy-by-design`, `simulate-user`, `test-harness-author`, `ux-review`.
- `.claude/hooks/*.mjs`: Node.js hook scripts. Cross-platform (Windows / macOS / Linux). Node is already a project dependency.

## Requirements
- Node.js 18+ on `PATH` (the project already pins Node 22 in `.github/workflows/build.yml` and uses Vite/Tauri which require Node).
- Hooks are invoked by Claude Code from the repo root, e.g. `node .claude/hooks/<name>.mjs`. No shell-specific syntax is used in `settings.json`.

## Required Claude Code Behavior
When starting a new feature, Claude Code should:
1. Read `docs/harness/README.md`.
2. Use `docs/harness/HARNESS_OPERATING_PLAYBOOK.md`.
3. Classify Low/Medium/High with `docs/harness/FEATURE_DIFFICULTY_TIERS.md`.
4. Track gates and work status in `docs/harness/PHASE_TEMPLATE.md`.
5. Use `docs/harness/FEATURE_REVIEW_CHECKLIST.md` for user-facing changes.
6. Use `docs/harness/DATA_INVENTORY_TEMPLATE.md` when data is collected, stored, displayed, exported, logged, or retained.
7. Complete `docs/harness/HANDOFF_TEMPLATE.md` before handoff.

## Hook Behavior
- `SessionStart`:
  - `session_status_snapshot.mjs` — injects the documentation map and non-negotiables.
  - `worktree_node_modules_link.mjs` — when run inside a git worktree (not the main checkout), symlinks `node_modules` to the main worktree so Vite/Tauri tooling resolves dependencies without a separate install.
- `UserPromptSubmit` (`user_prompt_harness_context.mjs`): injects harness context when the prompt contains feature/UX/privacy/storage/schema/hook/harness keywords, a `/stage-*` or `/harness-*` slash command, or references project paths (`src/`, `src-tauri/`, `docs/spec/`, `docs/harness/`, `.claude/`). Prompts without any match are passed through without injection to avoid polluting unrelated conversations.
- `PreToolUse(Bash)`:
  - `pre_tool_bash_guard.mjs` — blocks destructive or remote-execution command patterns; asks for confirmation on publishing or dependency installation.
  - `pre_tool_effort_collect.mjs` (matcher `Bash(git commit:*)`) — when the commit message contains `Ledger: Phase {X}`, detects the active Phase, locates the matching `docs/spec/*_harness_ledger.md`, and runs `scripts/harness-effort-collect.mjs` to populate the `<!-- effort:auto:begin --> … <!-- effort:auto:end -->` region before commit. Always exits 0 (advisory).
- `PreToolUse(Edit|Write)` (`pre_tool_privacy_guard.mjs`): asks for confirmation when edit/write input appears to add raw input fields.
- `PostToolUse(Edit|Write)` (`post_edit_quality_gate.mjs`): reminds Claude which quality checks apply based on touched concepts. Branch order: (1) **Harness self-maintenance** — any edit to `.claude/hooks/`, `.claude/settings(.local).json`, `.claude-context/`, `.claude/skills/`, `.claude/commands/`, or `docs/harness/` emits the self-maintenance checklist and short-circuits the remaining branches (see `docs/harness/HARNESS_SELF_MAINTENANCE.md`). (2) `docs/spec/*_s1.md` / `docs/spec/*_s2.md` saves emit the Quality Oracle / Harness Readiness Oracle checklist. (3) `.css` edits emit a stylelint advisory. (4) Source-file pattern checks (raw input identifiers, lifecycle primitives, persistence/schema, secrets/exec, UX-state primitives).
- `Stop`:
  - `stop_exit_check.mjs` — blocks only when required harness documents are missing by default. Warns when a Ledger is complete but its Retrospective is missing. Set `PIXEL_HORIZON_STRICT_STOP=1` to also block completion while changed files remain and force a final evidence/handoff check.
  - `cost_ledger.mjs` — inactive in normal sessions. Activated only when `HARNESS_LOOP_CYCLE_ID` is set (the harness-loop autonomous worker). Aggregates per-cycle token usage from session JSONL, computes USD estimate using `harness-loop.config.json` model pricing, and appends a record to `~/.claude/cache/harness-loop/cost-ledger.jsonl`.
- `PreCompact` (`session_status_snapshot.mjs`): reinjects harness context before compaction.
- `SubagentStop` (`subagent_stop_merge.mjs`): advisory by default. Set `PIXEL_HORIZON_STRICT_STOP=1` to require subagent handoff details before the parent task continues.

## Portability — 이식 시 교체 대상

각 훅·문서 상단의 `@portable` / `@project-specific(reason)` 태그 (마크다운은 frontmatter `portability` 필드) 가 이식성 표지. 다른 프로젝트에 하네스를 적용할 때 `@project-specific` 항목은 교체 또는 제거 검토 필요.

### 훅
| 파일 | 분류 | 사유 |
|---|---|---|
| `_config.mjs`, `_emit.mjs`, `cost_ledger.mjs`, `post_edit_quality_gate.mjs`, `pre_tool_bash_guard.mjs`, `pre_tool_effort_collect.mjs`, `session_status_snapshot.mjs`, `stop_exit_check.mjs`, `subagent_stop_merge.mjs`, `user_prompt_harness_context.mjs` | `@portable` | 도메인 무관 일반 패턴 |
| `pre_tool_privacy_guard.mjs` | `@project-specific` | Pixel Horizon 입력 식별자(keyCode/mouseX/cursorPath 등) 하드코딩 |
| `worktree_node_modules_link.mjs` | `@project-specific` | Node/Vite/Tauri 워크트리 가정 |

### 문서
`docs/harness/_INDEX.md` 의 role/portability 분류 표 참조. 핵심 워크플로우 문서 (Playbook, SELF_MAINTENANCE, 템플릿 등) 는 `portable`, 적용 가이드·아키텍처·대시보드는 `project-specific`.

### 설정
- `harness-loop.config.json` — `loop_budget`/`required_docs`/`strict_mode_default` 는 portable, `staged_mode.deny_paths`·`persona_pool`·프로젝트 특화 경로 패턴은 project-specific.

## Advisory Gates (design-rule.md §6)

| Footnote | 게이트 | 발동 태그 | Tier |
|---|---|---|---|
| Footnote 2 | C1~C6: ATK 매핑표·`file:line` 인용·`[verify:]` 태그·위임 임계 OR 4중·harness-entry grep·privacy 체크리스트 | `[s1-grep-trigger]` / `[verify-tag-trigger]` / `[privacy-surface-trigger]` | Medium+ |
| Footnote 3 | A2 Self-verify footer·E1 Subagent Invocations 1행·Privacy scrub | `[subagent-verify-trigger]` / `[subagent-metrics-trigger]` / `[subagent-privacy-trigger]` | All tier |
| Footnote 4 | G1 영향 파일 표 작성 전 `grep -rl` 결과 인용·G2 Phase Contract `mode: subagent\|main-batch` 명시 | `[pre-grep-trigger]` / `[delegation-mode-trigger]` | Medium+ |

모든 Footnote 는 placeholder 미발효 상태 (30일 advisory, 차단 아님). 세부는 `.claude-context/design-rule.md` §6 참조.

## Activation
Claude Code discovers project skills from `.claude/skills/` and project hooks from `.claude/settings.json`. Restart Claude Code after adding or changing skills. Settings changes are normally picked up by Claude Code's file watcher, but restart if behavior is unclear.

## Local Safety Notes
- The hook scripts are intentionally conservative. Some checks ask for confirmation rather than denying the operation.
- Stop/SubagentStop strict blocking is opt-in via `PIXEL_HORIZON_STRICT_STOP=1` to avoid accidental infinite stop loops.
- Long-running soak tests are not run by hooks. They should be routed to CI, nightly, or weekly jobs.
- `.claude/settings.local.json` can be used for personal machine-specific overrides and should not be committed.
