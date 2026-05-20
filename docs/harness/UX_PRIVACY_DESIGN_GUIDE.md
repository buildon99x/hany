---
role: behavior
portability: portable
---

# UX and Privacy Design Guide

Pixel Horizon's design standard is not only visual polish. A feature is acceptable when it is understandable, consistent, stable during background use, and respectful of personal privacy.

## Product Principles
- Make the current state obvious without requiring the user to inspect logs or settings.
- Prefer calm, predictable interactions over frequent prompts or noisy notifications.
- Keep background behavior visible enough to trust but not distracting.
- Treat privacy as a visible product quality, not hidden implementation detail.
- Collect aggregate activity signals only when they directly support the user-facing value.

## Required UI States
Every user-facing feature must define and review these states:

- Default
- Loading or syncing
- Empty
- Disabled
- Permission missing
- Error
- Recovering after background resume or sleep/wake
- Degraded mode when a dependency, local store, or background task is unavailable
- Retry, pause, or cancel for long-running work
- Success or applied

## Privacy Rules for Interaction Data
- Allowed: counts, rates, durations, coarse activity buckets, dropped-event ratios, aggregate latency.
- Not allowed: raw key values, typed strings, click coordinates, cursor paths, window titles, app-specific input contents, screenshots containing user content.
- Debug data must pass the same rule as production telemetry.
- Failure artifacts must be scrubbed before upload or sharing.
- Prefer coarse time buckets over highly granular timelines. Per-second or per-application activity views require a separate privacy review.

## Privacy Communication
- Explain what is collected in plain, calm language near the relevant setting or summary.
- State what is not collected when it reduces user concern, for example that typed text and exact click locations are not stored.
- Do not use fear-based copy to obtain permissions.
- Do not bury data deletion controls behind unrelated settings.

## UX Review Questions
- Can the user predict what the primary action does?
- Does the feature behave consistently after the app returns from background or sleep?
- Are permissions requested only at the moment they are needed?
- Does the UI explain permission impact without fear-based wording?
- Does the feature add notification or toast noise?
- Can the user stop, pause, or recover from the operation?
- Can the user understand what happened after restart, partial failure, or stale cached data?
- Are time ranges, day boundaries, and locale-sensitive labels clear?

## Visual and Interaction Consistency
- Reuse existing terminology and control patterns.
- Keep dense operational screens scannable rather than decorative.
- Avoid adding new colors or visual hierarchy unless they encode real product meaning.
- Error text should state what happened and the next available action.
- Degraded-state copy should be honest about what is unavailable without implying data has been collected or inspected.
