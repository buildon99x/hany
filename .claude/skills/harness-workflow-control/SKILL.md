---
name: harness-workflow-control
description: Control long-running Claude Code work with status snapshots, ADRs, loop budgets, pause points, and handoff summaries. Use during multi-step tasks, simulations, harness updates, or repeated failures.
---

# Harness Workflow Control

Use this skill to keep long-running work understandable and interruptible.

## Status Snapshot
Keep the current state in the shape defined by `docs/harness/WORK_STATUS_TEMPLATE.md`:
- Goal.
- Current step.
- Changed files.
- Commands run.
- Evidence.
- Blockers.
- Next action.
- Pause point.

## ADR Rule
Create or update an ADR for structural changes to:
- Harness architecture.
- Fixture schema.
- Oracle criteria.
- Privacy policy.
- CI gates.
- Claude Code hooks.

## Loop Budget
- Automatic fixes for the same failure: 3 attempts.
- Same test rerun without changed input or code: 2 attempts.
- After the budget is consumed, report hypothesis, evidence, and options instead of continuing.

## Pause Points
Pause before destructive changes, privacy exceptions, permission escalation, long soak runs, migrations, public APIs, broad refactors, or uncertain gate failures.
