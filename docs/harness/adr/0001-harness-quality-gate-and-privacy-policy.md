# ADR 0001: Harness Quality Gate and Privacy Policy

## Status
Accepted

## Context
Pixel Horizon is expected to run continuously in the background on desktop and laptop machines. The app must remain stable over long sessions while preserving the user's privacy. Development is mainly performed in Claude Code, so quality rules need to be explicit, repeatable, and enforceable through skills, hooks, CI, and review checklists.

## Decision
Adopt a feature quality gate that requires every new feature to satisfy four axes before completion:

- Requirement correctness through acceptance cases and focused tests.
- UI/UX clarity, consistency, and complete visible states.
- Resident stability across long idle sessions, sleep/wake, and environment changes.
- Privacy by design, with aggregate-only keyboard/mouse data and no raw key, text, click coordinate, window title, or app-specific input content storage.

Claude Code hooks and skills will support this policy by injecting context, checking privacy-sensitive fields, tracking loop budget, and preventing completion when acceptance, UI, stability, privacy, or test evidence is missing.

## Consequences
- Feature work needs slightly more upfront structure, but fewer regressions should escape into long-running desktop usage.
- Privacy checks become part of normal development rather than a final review step.
- Hook behavior must be reviewed as project code because an overly broad hook can block useful work or create a security risk.
- Long-running soak tests stay in CI/Nightly/Weekly jobs rather than local hooks.

## Alternatives
- Rely only on PR review: rejected because privacy and long-run stability regressions are easy to miss manually.
- Put all checks into Claude Code hooks: rejected because long-running or flaky checks would slow normal development and increase false positives.
- Record detailed input events for easier debugging: rejected because it conflicts with the core privacy value of aggregate-only input measurement.

## Validation
- PR privacy guard passes with raw input fields at 0.
- Fixture/log/artifact scrubber passes.
- Feature Quality Note links acceptance cases to tests.
- Resident soak reports meet CPU, memory, handle, timer, and log growth limits.
- Claude Code Stop hook reports no missing acceptance/UI/stability/privacy/test evidence.
