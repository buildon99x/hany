---
role: behavior
portability: portable
---

# Feature Difficulty Tiers

Use this tiering before implementation. The goal is to scale process weight to risk without weakening privacy, correctness, or resident stability where they matter.

## Tier Definitions
| Tier | Typical feature | Risk profile | Planning weight |
| --- | --- | --- | --- |
| Low | Copy change, visual polish, non-persistent UI preference | No schema change, no new background work, no new data collection | Lightweight |
| Medium | New user-facing workflow, local state, settings, summary panel | UI states, local persistence, existing aggregate data, possible lifecycle touch | Standard |
| High | New event pipeline, storage format, background worker, permissions, privacy-sensitive aggregation, public API | Cross-layer behavior, resident stability, privacy, migration, compatibility | Full gate |

## Tier Selection Questions
- Does it add or change data collection, storage, export, upload, or retention?
- Does it touch keyboard/mouse input handling, event aggregation, or privacy scrubbers?
- Does it add timers, listeners, workers, subscriptions, caches, or background tasks?
- Does it change persisted schema, invoke/event payloads, permissions, or public API?
- Does failure affect core UX, resident stability, or trust?
- Does it need restart, retry, migration, rollback, or interrupted-write behavior?
- Does it add a hook, plugin, updater, external dependency, export, or report that changes the security boundary?
- Does it depend on timezone, locale, offline/online state, battery saver, or display/DPI behavior?

If any answer is yes for privacy-sensitive data, background lifecycle, permission, or persisted schema, raise the tier by at least one level.

## Required Evidence by Tier
| Evidence | Low | Medium | High |
| --- | --- | --- | --- |
| Quality gate matrix | Short form | Required | Required with risk register |
| Feature Quality Note | Short form | Required | Required |
| Design checklist | Changed states only | Required for user-facing flow | Required plus UX risk review |
| Data inventory | Only if data touched | Required if persistence or telemetry touched | Required |
| Unit tests | Focused | Required | Required |
| Contract tests | If payload/schema touched | If payload/schema touched | Required for payload/schema changes |
| E2E smoke | If user flow changed | Required | Required with edge paths |
| Privacy scrubber | Always for touched artifacts | Always | Always blocking |
| Lifecycle cleanup test | If lifecycle touched | If lifecycle touched | Required |
| Soak evidence | Not required | Nightly if lifecycle/background touched | Nightly/weekly release blocking |
| ADR | Not required | If structural decision | Required for architecture/privacy/schema/hook decisions |
| Recovery/degraded-mode evidence | If touched | Required when persistence/background touched | Required |
| Migration/rollback evidence | If schema touched | If schema touched | Required for persisted schema changes |
| Gate calibration | If harness gate changed | If harness gate changed | Required for new blocking gates |
| Security boundary review | If reports/hooks/exports touched | Required when touched | Required |

## Timebox Guidance
- Low: stop after focused validation unless a privacy or lifecycle risk appears.
- Medium: run PR-blocking checks and defer long soak to nightly if no release-blocking risk is found.
- High: require explicit pause point before broad refactor, migration, or long-running validation.

## Escalation and De-escalation
- Escalate when new evidence shows privacy, background lifecycle, schema, or permission impact.
- De-escalate only when the change demonstrably does not touch user data, background behavior, or cross-layer contracts.
- Record tier changes in the Feature Quality Note.
