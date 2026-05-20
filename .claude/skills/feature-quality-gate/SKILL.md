---
name: feature-quality-gate
description: Apply the project feature quality gate before and after implementing new features. Use when adding, changing, or reviewing product functionality, UI flows, storage, contracts, or harness behavior.
---

# Feature Quality Gate

Use this skill for every feature or harness change.

## Required Flow
1. Start from `docs/harness/HARNESS_OPERATING_PLAYBOOK.md`.
2. Classify the work as Low, Medium, or High using `docs/harness/FEATURE_DIFFICULTY_TIERS.md`.
3. Write acceptance cases in Given/When/Then form.
4. Map each acceptance case to evidence in `docs/harness/QUALITY_GATE_MATRIX.md`.
5. Complete `docs/harness/FEATURE_QUALITY_NOTE_TEMPLATE.md` before handoff.

## Escalate Tier
Raise the tier immediately when the work touches:
- Privacy-sensitive data.
- Background lifecycle.
- Persisted schema.
- Permissions.
- Cross-layer contracts.
- Recovery, migration, rollback, or interrupted-write behavior.
- Hooks, plugins, reports, exports, or updater paths.

## Stop Conditions
Stop and report the current state when:
- A privacy exception is needed.
- A persisted schema migration is required.
- The same failure has consumed the loop budget.
- A long-running soak is needed.
- The gate cannot tell whether a failure is product behavior, harness drift, or environment variance.
