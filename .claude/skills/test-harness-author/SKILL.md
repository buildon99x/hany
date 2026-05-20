---
name: test-harness-author
description: Design or update harness fixtures, drivers, oracles, reporters, privacy scrubbers, and quality gates. Use when adding test infrastructure, CI gates, dashboards, synthetic fixtures, or failure artifacts.
---

# Test Harness Author

Follow the four-layer harness in `docs/harness/HARNESS_PLAN.md`.

## Fixture Layer
- Use synthetic aggregate events only.
- Never use raw keyboard or mouse input payloads.
- Include `schema_version`, `seed`, `duration_ms`, `platform_profile`, `power_profile`, `privacy_level`, and expected digest when relevant.

## Driver Layer
- Use deterministic clocks and mock streams.
- Use `PH_TEST_MODE=1` for OS hook isolation.
- Mock sleep/wake, network, display, and long-run profiles.

## Oracle Layer
- Verify state snapshots, perceptual hashes, UX metrics, resident stability metrics, privacy scans, recovery, migration, and security boundary checks.

## Reporter Layer
- Include repro command, metrics, failure classification, and next action.
- Scrub raw input, secrets, tokens, private paths, local usernames, and machine identifiers.

## Gate Calibration
New blocking gates require a negative sample or known-failing fixture before they become blocking.
