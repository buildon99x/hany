// @portable
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { getRequiredDocs, getStrictMode } from "./_config.mjs";

const requiredDocs = getRequiredDocs([
  "docs/harness/HARNESS_OPERATING_PLAYBOOK.md",
  "docs/harness/FEATURE_DIFFICULTY_TIERS.md",
  "docs/harness/QUALITY_GATE_MATRIX.md",
  "docs/harness/FEATURE_QUALITY_NOTE_TEMPLATE.md",
  "docs/harness/FEATURE_REVIEW_CHECKLIST.md",
]);

const missing = requiredDocs.filter((doc) => !existsSync(doc));

if (missing.length > 0) {
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason: `Harness exit check: required harness documents are missing: ${missing.join(", ")}. Restore or create them before finishing.`,
    }),
  );
  process.exit(0);
}

// Collect retrospective warnings (never block — continue to strict-mode check).
const retroWarnings = [];
try {
  const docsEntries = readdirSync("docs/spec").map((f) => `spec/${f}`);
  const ledgers = docsEntries.filter((f) => /^spec\/.+_harness_ledger\.md$/.test(f));
  const missingRetro = ledgers.filter((ledger) => {
    let content = "";
    try {
      content = readFileSync(`docs/${ledger}`, "utf8");
    } catch {
      return true;
    }
    // If Phase Status section has any in-progress or not-started rows, phases are still running — skip warn.
    const phaseMatch = content.match(/##\s*Phase Status[\s\S]*?(?=\n##|\s*$)/);
    if (phaseMatch && /🔄|🔲|⏳/.test(phaseMatch[0])) return false;
    const retroName = ledger.replace("_harness_ledger.md", "_harness_retrospective.md");
    return !existsSync(`docs/${retroName}`);
  });
  if (missingRetro.length > 0) {
    const names = missingRetro.map((f) => f.replace("spec/", "").replace("_harness_ledger.md", "")).join(", ");
    retroWarnings.push(
      `Harness exit check (warn): Ledger 완료됐지만 Retrospective 미작성: ${names}. ` +
        `docs/spec/{name}_harness_retrospective.md 작성으로 L4 피드백 루프 닫기 권장.`,
    );
  }
} catch {
  // docs/ not readable — skip retrospective check silently
}

if (!getStrictMode()) {
  if (retroWarnings.length > 0) {
    process.stdout.write(
      JSON.stringify({ decision: "approve", reason: retroWarnings.join("\n") }),
    );
  }
  process.exit(0);
}

let status = "";
try {
  status = execSync("git status --short", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
} catch {
  process.exit(0);
}

if (/(^|\n)\s*(M|A|\?\?)\s+(.+\.md|.+\.ts|.+\.tsx|.+\.rs|.+\.js|.+\.json)/.test(status)) {
  const baseReason = `Harness exit check:
- If this was feature or harness work, ensure difficulty tier, acceptance cases, UX/privacy/stability/recovery/security evidence, and Feature Quality Note are complete.
- If evidence is intentionally deferred, record owner and expiry.
- If this was only exploratory work, summarize changed files and remaining risks.
- To disable strict stop blocking, unset PIXEL_HORIZON_STRICT_STOP.`;
  const reason =
    retroWarnings.length > 0
      ? baseReason + "\n\nAdditionally: " + retroWarnings.join("\n")
      : baseReason;
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
} else if (retroWarnings.length > 0) {
  process.stdout.write(
    JSON.stringify({ decision: "approve", reason: retroWarnings.join("\n") }),
  );
}
