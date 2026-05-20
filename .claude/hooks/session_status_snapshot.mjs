// @portable
import { readFileSync } from "node:fs";
import { emitAdvisory } from "./_emit.mjs";

const raw = readFileSync(0, "utf8");
let hookName = "SessionStart";
try {
  if (raw.trim().length > 0) {
    const event = JSON.parse(raw);
    if (event && typeof event.hook_event_name === "string") {
      hookName = event.hook_event_name;
    }
  }
} catch {
  // keep default "SessionStart"
}

const context = `Project harness quick context:
- Documentation map: docs/harness/README.md
- Operating playbook: docs/harness/HARNESS_OPERATING_PLAYBOOK.md
- Difficulty tiers: docs/harness/FEATURE_DIFFICULTY_TIERS.md
- Phase template (gate + work status): docs/harness/PHASE_TEMPLATE.md
- Feature handoff: docs/harness/HANDOFF_TEMPLATE.md
- Additional perspectives: docs/harness/ADDITIONAL_REVIEW_PERSPECTIVES.md

Non-negotiables:
- Aggregate-only keyboard/mouse data.
- Privacy scrubber for touched artifacts.
- Lifecycle cleanup for background resources.
- Recovery/migration/security review when touched.
- Loop budget before repeated automatic fixes.`;

emitAdvisory(hookName, context);
