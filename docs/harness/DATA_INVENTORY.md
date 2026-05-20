# Data Inventory — chromvox-ux-improve

> Delta-only: lists fields added by this feature. Prior fields unchanged.

---

## Data Item 1 — chromvox_first_run_dismissed_count

- **Name**: `tutorial_seen.chromvox_first_run_dismissed_count`
- **Feature**: chromvox-ux-improve Phase A/B
- **Purpose**: Count how many times the user manually dismissed the CX-1 First-Run overlay (reason="manual"). Used for ADR §D follow-on analysis surface (B-Q7).
- **Required for core value**: No (captured for future analytics only)
- **Data category**: Aggregate

### Collection
- **Source**: User action — "다시 보지 않기" button click on First-Run overlay
- **Collection timing**: On each manual dismiss event via `mark_chromvox_first_run_seen("manual")` IPC
- **User-visible explanation**: None (background counter; the action is user-initiated)
- **Permission required**: None
- **Raw input present**: No
- **Aggregation granularity**: Lifetime integer counter — event count only
- **Minimum bucket size**: 1 event per increment; no session detail
- **Per-app or per-window breakdown present**: No
- **Re-identification risk**: Low

### Storage
- **Stored locally**: Yes — `state.json` → `tutorial_seen.chromvox_first_run_dismissed_count`
- **Stored remotely**: No
- **Path or table**: `<app_data_dir>/state.json`
- **Retention**: Indefinite (user account lifetime); cleared by Reset Storage
- **Deletion path**: Reset Storage command or manual `state.json` deletion
- **Encryption or protection**: OS filesystem user permissions

### Privacy Constraints
- Keyboard raw values stored: No
- Typed strings stored: No
- Mouse coordinates or cursor paths stored: No
- Window title or app-specific input content stored: No
- Screenshots or user-content artifacts stored: No
- Per-second activity timeline stored: No
- Per-application activity timeline stored: No

---

## Data Item 2 — chromvox_first_sp_step_count

- **Name**: `tutorial_seen.chromvox_first_sp_step_count`
- **Feature**: chromvox-ux-improve Phase A/B
- **Purpose**: Count how many times the user visited the CHROMVOX page while SP=0 (before the First-Run condition was met). Used for ADR §D follow-on analysis (B-Q7 capture).
- **Required for core value**: No
- **Data category**: Aggregate

### Collection
- **Source**: `SkillsPage._mountFirstRun()` — called on page show when `skill_points < 1`
- **Collection timing**: Page entry with SP=0 + tutorial flag not yet seen
- **User-visible explanation**: None
- **Permission required**: None
- **Raw input present**: No
- **Aggregation granularity**: Lifetime integer counter
- **Minimum bucket size**: 1 event per page visit
- **Per-app or per-window breakdown present**: No
- **Re-identification risk**: Low

### Storage
- **Stored locally**: Yes — `state.json` → `tutorial_seen.chromvox_first_sp_step_count`
- **Stored remotely**: No
- **Path or table**: `<app_data_dir>/state.json`
- **Retention**: Indefinite; cleared by Reset Storage
- **Deletion path**: Reset Storage command or manual `state.json` deletion
- **Encryption or protection**: OS filesystem user permissions

### Privacy Constraints
- Keyboard raw values stored: No
- Typed strings stored: No
- Mouse coordinates or cursor paths stored: No
- Window title or app-specific input content stored: No
- Screenshots or user-content artifacts stored: No
- Per-second activity timeline stored: No
- Per-application activity timeline stored: No

### Validation
- Privacy scrubber: `grep -rn "clientX\|clientY\|keyCode\|key_value\|typed_string\|cursor_path" src-tauri/src/commands/tutorial.rs` → 0 matches
- Schema denylist result: No raw input fields in `TutorialSeen` struct
- Aggregation review result: Both counters are event counts only — no timing, no content
- Reviewer: harness Phase D

---

## Context Menu Coordinate Handling (non-stored)

`clientX`/`clientY` from the `contextmenu` event are used in `SkillsPage._openContextMenu()` as `menuOffsetX`/`menuOffsetY` local variables for DOM positioning only. They are not stored, logged, or transmitted. The privacy guard PostToolUse hook was triggered and verified during Phase C implementation.
