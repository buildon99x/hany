// @portable
import { readFileSync } from "node:fs";
import { emitAdvisory } from "./_emit.mjs";

const raw = readFileSync(0, "utf8");
let event;
try {
  event = JSON.parse(raw);
} catch {
  process.exit(0);
}

const promptText = String(event?.prompt ?? "");

const triggers = [
  /\b(feature|ux|privacy|storage|schema|hook|harness|migration|persisted|lifecycle|security|scrubber|ledger|retro|adr|stage|phase|tier|gate|soak)\b/i,
  /\/(stage-start|stage-end|harness-start|harness-maintain|harness-loop|harness-import|harness-loop-staged)\b/i,
  /(기능|프라이버시|마이그레이션|보안|스키마|하네스|라이프사이클|회고|페이즈|스테이지|영속|핸드오프|타이머|리스너|워커)/,
  /(^|[\s`"'(])(src\/|src-tauri\/|docs\/feat_|docs\/harness\/|\.claude\/)/,
];

if (!triggers.some((re) => re.test(promptText))) {
  process.exit(0);
}

const context = `Project harness context:
- Start with docs/harness/HARNESS_OPERATING_PLAYBOOK.md.
- Classify Low/Medium/High using docs/harness/FEATURE_DIFFICULTY_TIERS.md.
- Track gate status in docs/harness/PHASE_TEMPLATE.md.
- For user-facing changes, use docs/harness/FEATURE_REVIEW_CHECKLIST.md.
- For collected/stored/logged/displayed/exported data, use docs/harness/DATA_INVENTORY_TEMPLATE.md.
- Before handoff, complete docs/harness/HANDOFF_TEMPLATE.md.
- Never store raw key values, typed strings, click coordinates, cursor paths, window titles, app-specific input contents, or user-content screenshots.
- Stop for privacy exceptions, persisted schema migration, High-tier escalation, repeated failures beyond loop budget, destructive changes, or unclear product-vs-harness failures.`;

emitAdvisory("UserPromptSubmit", context);
