// @portable
// PreToolUse(Bash) hook: detect Phase commit and trigger Effort Ledger
// auto-append. Always exit 0 (advisory) — never block git commit.
// Sniffs `git commit -m "...Ledger: Phase {X}..."` (or --message variants)
// to locate the active Phase. Multi-ledger / unresolved ambiguity → noop.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

function readStdin() {
  try { return readFileSync(0, "utf8"); } catch { return ""; }
}

function parseEvent(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

function extractPhase(cmd) {
  if (!/\bgit\s+commit\b/.test(cmd)) return null;
  const m = cmd.match(/Ledger:\s*Phase\s+([A-Z0-9]{1,4})/);
  return m ? m[1] : null;
}

function findActiveLedger(repoRoot, phase) {
  const docsDir = resolve(repoRoot, "docs");
  if (!existsSync(docsDir)) return null;
  let entries;
  try { entries = readdirSync(docsDir); } catch { return null; }
  const ledgers = entries.filter((f) => /^feat_.+_harness_ledger\.md$/.test(f));
  const matches = [];
  for (const f of ledgers) {
    const p = resolve(docsDir, f);
    let content;
    try { content = readFileSync(p, "utf8"); } catch { continue; }
    if (!content.includes("<!-- effort:auto:begin -->")) continue;
    const phaseRow = new RegExp(`\\|\\s*\\d+\\s*\\|\\s*${phase}\\s*[—-]`).test(content);
    if (phaseRow) matches.push(p);
  }
  return matches.length === 1 ? matches[0] : null;
}

const event = parseEvent(readStdin());
if (!event) process.exit(0);

const command = String(event?.tool_input?.command ?? "");
const phase = extractPhase(command);
if (!phase) process.exit(0);

const repoRoot = process.env.PIXEL_HORIZON_REPO_ROOT || process.cwd();
const ledger = findActiveLedger(repoRoot, phase);
if (!ledger) process.exit(0);

const branchRes = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
  cwd: repoRoot, encoding: "utf8",
});
const branch = (branchRes.stdout || "").trim();
if (!branch || branchRes.status !== 0) process.exit(0);

const script = resolve(repoRoot, "scripts/harness-effort-collect.mjs");
if (!existsSync(script)) process.exit(0);

const args = ["--ledger", ledger, "--phase", phase, "--branch", branch];
if (process.env.PIXEL_HORIZON_EFFORT_PROJECTS_DIR) {
  args.push("--projects-dir", process.env.PIXEL_HORIZON_EFFORT_PROJECTS_DIR);
}
args.push("--repo-root", repoRoot);

const run = spawnSync("node", [script, ...args], {
  cwd: repoRoot, encoding: "utf8",
});
if (run.status === 0) {
  spawnSync("git", ["add", ledger], { cwd: repoRoot, encoding: "utf8" });
}
process.exit(0);
