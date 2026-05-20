---
role: behavior
portability: portable
---

# Data Inventory Template

Use this for any feature that collects, stores, logs, displays, exports, or uploads user-related data. The default policy is aggregate-only input measurement.

> **Delta-only rule.** List only the fields this feature adds, removes, or changes. Do not restate untouched fields from prior inventories. Existing fields without a behavior change link out to their original inventory or the relevant ADR; the reviewer reads the diff, not a re-creation.

## Data Item
- Name:
- Feature:
- Purpose:
- Required for core value: Yes / No
- Data category: Aggregate / Derived / Configuration / Diagnostic / Sensitive

## Collection
- Source:
- Collection timing:
- User-visible explanation:
- Permission required:
- Raw input present: No
- If raw input is unavoidable, linked approval/ADR:
- Aggregation granularity:
- Minimum bucket size:
- Per-app or per-window breakdown present: No
- Re-identification risk: Low / Medium / High

## Storage
- Stored locally:
- Stored remotely:
- Path or table:
- Retention:
- Deletion path:
- Encryption or protection:

## Privacy Constraints
- Keyboard raw values stored: No
- Typed strings stored: No
- Mouse coordinates or cursor paths stored: No
- Window title or app-specific input content stored: No
- Screenshots or user-content artifacts stored: No
- Per-second activity timeline stored: No
- Per-application activity timeline stored: No

## Validation
- Privacy scrubber command:
- Schema denylist result:
- Log/artifact scan result:
- Aggregation review result:
- Reviewer:
