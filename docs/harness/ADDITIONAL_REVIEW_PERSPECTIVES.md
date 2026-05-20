---
role: behavior
portability: portable
---

# Additional Review Perspectives

This review captures quality angles that are easy to miss when the team focuses only on feature correctness, UX polish, resident stability, privacy, and Claude Code workflow control. Use it before adding new gates or reviewing a high-risk feature.

## 1. Recovery and Degraded Operation
- A feature should define what the user sees when a dependency fails, the local store is temporarily unavailable, or the app restarts mid-operation.
- Background work must be restartable without duplicate timers, duplicated notifications, or double-counted aggregate activity.
- If a feature cannot finish, it should leave an explainable partial state and a retry or pause path.
- Recovery evidence should include crash/restart, interrupted write, and stale cache scenarios when persistence or background work is touched.

## 2. Data Integrity and Migration Safety
- Persisted data changes require compatibility checks for old schema, missing fields, corrupted records, and downgrade or rollback behavior.
- Aggregate activity data must avoid silent double counting after retry, resume, migration, or replay.
- Migration failure must not erase user data unless the deletion path is explicit, confirmed, and documented.
- Feature Quality Notes should identify whether the change is additive, migratory, or destructive.

## 3. Harness Trustworthiness
- A passing harness is useful only when it can prove that its fixtures, oracles, and scrubbers are current.
- Each major gate should include at least one known-failing sample or synthetic negative case so the team knows the gate can fail for the right reason.
- Flaky tests should be measured separately from product failures; quarantine must not hide user-impacting regressions.
- Baselines should expire or be reviewed after product UI, platform, or schema changes.

## 4. Desktop Environment Variability
- Verify behavior across battery saver, low-power CPU throttling, external monitor changes, timezone/daylight-saving changes, locale changes, and offline/online transitions when relevant.
- Long-running background apps should minimize wakeups and avoid unnecessary disk writes while idle.
- Update/install/uninstall paths should preserve privacy guarantees and not leave sensitive artifacts behind.
- OS-specific behavior should be recorded as platform evidence rather than assumed equivalent.

## 5. Security Boundary Beyond Privacy
- Privacy forbids collecting raw input content; security also requires protecting local files, secrets, IPC boundaries, update channels, and exported reports.
- Claude Code hooks must not introduce remote code execution, arbitrary shell execution, secret exfiltration, or broad file access.
- Reports and dashboards should not expose local usernames, absolute private paths, tokens, machine identifiers, or network details unless explicitly scrubbed.
- Any new import, plugin, hook, or updater path should have a trust and provenance check.

## 6. Accessibility, Locale, and Time Semantics
- User-facing features should remain usable with keyboard navigation, screen scaling, high contrast, and reduced motion settings where applicable.
- Time-based summaries must define timezone, day-boundary, daylight-saving, and clock-skew behavior.
- Copy should avoid ambiguous time ranges such as "today" unless the underlying timezone is clear.
- Aggregation buckets should be understandable without exposing granular personal behavior.

## 7. Operational Ownership
- Every blocking gate needs an owner, failure interpretation, and next action.
- A release should not depend on a dashboard that no one reviews or a flaky alert that no one owns.
- Deferred evidence must include an expiry date or release milestone; otherwise it becomes invisible debt.
- Repeated user-facing failures should create a product decision, not only another harness task.

## Integration Rule
When one of these perspectives applies, reflect it in the `Quality Gate Matrix`, `Feature Quality Note`, and either the design checklist or ADR. If the added review would slow a Low-tier task without reducing real risk, record it as "not applicable" instead of adding process weight.
