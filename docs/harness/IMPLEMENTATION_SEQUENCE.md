---
role: reference
portability: portable
---

# Implementation Sequence

This sequence turns the harness plan into work that can be delivered incrementally. Each phase should leave the project in a usable state.

## Phase 0: Baseline Documents
- Use `docs/harness/README.md` as the documentation map.
- Keep `docs/harness/HARNESS_PLAN.md` as the north-star plan.
- Use `docs/harness/HARNESS_OPERATING_PLAYBOOK.md` for the day-to-day workflow.
- Use `docs/harness/QUALITY_GATE_MATRIX.md` for feature traceability.
- Use `docs/harness/WORK_STATUS_TEMPLATE.md` for long-running or interrupted work.
- Use `docs/harness/DATA_INVENTORY_TEMPLATE.md` for privacy-sensitive changes.
- Record structural choices in `docs/adr/`.
- Use `docs/harness/GLOSSARY.md` to keep terms consistent across docs, PRs, and Claude Code skills.

## Phase 1: Privacy and Schema Guard
- Define aggregate-only event schema.
- Add raw input denylist for fixtures, logs, artifacts, and storage schemas.
- Add privacy scrubber smoke check to PR validation.
- Verify raw key, text, coordinate, cursor path, window title, and app-specific input content are not persisted.

## Phase 2: Feature Quality Gate
- Triage feature difficulty using `docs/harness/FEATURE_DIFFICULTY_TIERS.md`.
- Add acceptance-case template to feature work.
- Connect design checklist to review.
- Require focused unit/contract/e2e evidence for each acceptance case.
- Add `docs/harness/FEATURE_QUALITY_NOTE_TEMPLATE.md` to PR or task output.
- Use `docs/harness/QUALITY_GATE_MATRIX.md` to distinguish PR-blocking, nightly, weekly, and release-blocking evidence.
- Scale required evidence by Low / Medium / High tier, but keep privacy scrubber blocking for all touched artifacts.

## Phase 3: Resident Stability Harness
- Add lifecycle tests for timers, listeners, workers, subscriptions, and caches.
- Add resident idle fixture and sampler for CPU, RSS/heap, handles, threads, timers, queue backlog, and log/cache growth.
- Add sleep/wake and network/display profile mocks.
- Add restart, interrupted-write, stale-cache, and duplicate-work recovery fixtures for features with persistence or background work.

## Phase 4: Claude Code Workflow Controls
- Add project skills for feature quality, privacy, resident stability, UX review, and harness workflow control.
- Add hooks for privacy guard, post-edit quality checks, stop checks, status snapshots, and loop budget.
- Keep hooks fast and deterministic; route long-running checks to CI.
- Add hook safety checks for secret/path/token exposure and untrusted remote execution.

## Phase 5: Dashboards and Long-Run Gates
- Add UX metrics dashboard.
- Add resident stability dashboard.
- Add privacy scan report.
- Enable nightly 2-hour soak and weekly 8-hour all-day soak.
- Add gate calibration with known-failing samples and baseline expiry review.
- Add platform variance reporting for battery saver, offline/online, display/DPI, timezone, and locale-sensitive flows.

## Rollout Rule
Do not introduce a stricter blocking gate until the corresponding report can explain why it failed and what the next action is.

## Simulation Rule
Before adding a major new harness capability, run one fictional but realistic feature through the templates and record the result in `docs/harness/simulations/`. Update the harness documents when the simulation exposes unclear ownership, missing evidence, excessive friction, or privacy ambiguity.

## Difficulty Rule
Before implementation, classify the feature as Low, Medium, or High difficulty. Reclassify upward immediately if the work touches privacy-sensitive data, background lifecycle, persisted schema, permissions, or cross-layer contracts.

## Calibration Rule
Any new harness gate must include a negative sample or known-failing fixture before it becomes blocking. If the gate cannot explain the failure cause, keep it advisory until the report identifies whether the fault is product behavior, harness drift, or environment variance.
