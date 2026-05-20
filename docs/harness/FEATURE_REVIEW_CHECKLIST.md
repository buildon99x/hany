---
role: behavior
portability: portable
---

# Feature Review Checklist

Use this checklist before a feature is considered complete.

## Requirement Correctness
- [ ] Acceptance cases cover success, empty, error, permission denied, resume, and retry paths.
- [ ] Tests map to each acceptance case.
- [ ] Contract changes are documented and backward compatibility is tested.

## UI/UX Quality
- [ ] Default, loading, empty, disabled, error, permission, and success states are present.
- [ ] Copy uses existing product terms.
- [ ] Primary action is visually clear.
- [ ] Notifications are throttled and do not interrupt normal flow.
- [ ] Keyboard navigation and focus order work for modal or settings changes.
- [ ] **New horizontal stat/toolbar/footer cell**: adjacent-cell flex ratio table present (`id | prior flex | new flex | rationale`), with subtractor cell and reason named when sum changes. (사례: lesson 2026-05-14 new-item-tone-and-visual-weight)
- [ ] **New i18n label key under existing prefix**: group prefix tone-and-manner verified via grep — uppercase-Latin / translated / mixed pattern chosen consistently with sibling keys. (`docs/i18n-style-guide.md` §5.1)

## Resident Stability
- [ ] New timers, listeners, workers, subscriptions, and caches have explicit cleanup.
- [ ] Behavior is verified after background/resume.
- [ ] Sleep/wake and network/display changes are considered when relevant.
- [ ] Long-running work has a cancellation or pause path.

## Recovery and Data Integrity
- [ ] Restart, retry, and interrupted-operation states are understandable to the user.
- [ ] Persisted data changes handle old schema, missing fields, corrupted records, and rollback.
- [ ] Aggregate activity cannot be double-counted after retry, replay, migration, or resume.
- [ ] Degraded mode does not silently erase data or hide a stuck background task.

## Privacy
- [ ] Keyboard/mouse data is aggregate-only.
- [ ] No raw key, text, click coordinate, cursor path, window title, or app-specific input content is stored.
- [ ] Logs and failure artifacts pass privacy scrubber.
- [ ] Data purpose, storage location, retention, and deletion path are documented.

## Security and Environment
- [ ] Reports, dashboards, and logs scrub secrets, tokens, local usernames, private paths, and machine identifiers.
- [ ] Claude Code hooks, plugins, and external tools have a clear trust boundary.
- [ ] Offline/online, battery saver, display/DPI, timezone, locale, and clock-skew behavior are considered when relevant.
- [ ] Accessibility, scaling, high contrast, and reduced motion are considered for user-facing UI.

## Evidence
- [ ] Focused tests passed:
- [ ] Manual review notes:
- [ ] Related ADR:
- [ ] Remaining risk:
- [ ] Deferred evidence expiry:
