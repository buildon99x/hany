---
role: behavior
portability: portable
deprecated: see HANDOFF_TEMPLATE.md (§1–§9)
---

> **DEPRECATED** — 신규 피처는 `HANDOFF_TEMPLATE.md` §1–§9 사용. 본 파일은 기존 PR 참조 호환을 위해 유지.

# Feature Quality Note

Use this note in the PR description or task summary for every feature. It is the compact handoff that connects implementation, harness evidence, UX review, stability, and privacy.

## Feature
- Name:
- Related request:
- Related ADR:
- Quality gate matrix:
- Data inventory:
- Difficulty tier:
- Tier rationale:
- Tier changes during implementation:

## Requirement Evidence
| Acceptance case | Evidence | Result |
| --- | --- | --- |
|  |  |  |

## UI/UX Evidence
- Reviewed checklist:
- States covered:
- User-facing copy changes:
- Accessibility notes:
- Remaining UX risk:

## Resident Stability Evidence
- Lifecycle cleanup checked:
- Background/resume checked:
- Sleep/wake checked:
- Soak or sampler evidence:
- Remaining stability risk:

## Recovery and Data Integrity Evidence
- Degraded mode:
- Retry or pause path:
- Restart/interrupted-write evidence:
- Migration or rollback evidence:
- Double-counting prevention:

## Privacy Evidence
- Data collected:
- Aggregation level:
- Raw input fields present: No
- Privacy scrubber result:
- Retention/deletion documented:

## Security and Environment Evidence
- Secret/path/token scrub result:
- External dependency or hook trust review:
- Offline/online, battery, display, timezone, or locale evidence:
- Accessibility or time-semantics notes:

## Operations
- Failure artifacts:
- Rollback or mitigation:
- Pause point:
- Follow-up:
- Deferred evidence expiry:

## Stop Conditions Hit
List any stop-condition that triggered during implementation, with the resolution. Examples: tier escalated mid-flight; loop budget consumed on a recurring failure; privacy exception requested; persisted schema migration uncovered; long-running soak required.

- Trigger:
- Decision:
- Owner of follow-up:
