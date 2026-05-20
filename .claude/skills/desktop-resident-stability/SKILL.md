---
name: desktop-resident-stability
description: Review long-running desktop/laptop resident behavior. Use when code touches timers, listeners, workers, subscriptions, caches, background tasks, sleep/wake, restart, logs, queues, or resource sampling.
---

# Desktop Resident Stability

Pixel Horizon runs continuously in the background. A feature is not complete if it slowly consumes resources or drifts after sleep, resume, or restart.

## Check Lifecycle
- New timers have cleanup.
- New listeners have cleanup.
- New workers can stop.
- New subscriptions are unsubscribed.
- Caches have bounds.
- Queue backlog recovers after idle.

## Check Long-Run Behavior
Use the SLOs in `docs/harness/HARNESS_PLAN.md`:
- Idle CPU average under 2%, P95 under 5%.
- RSS/heap plateau within limits after warm-up.
- Handle/thread/timer counts plateau within limits.
- Log/cache growth stays within daily cap and rotates.

## Recovery Cases
When persistence or background work is touched, require evidence for:
- Crash/restart replay.
- Interrupted write.
- Stale cache.
- Sleep/wake.
- Offline/online.
- Duplicate work and double-counting prevention.
