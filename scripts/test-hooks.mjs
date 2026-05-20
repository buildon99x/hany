import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const hooks = (name) => resolve(repoRoot, ".claude/hooks", name);

let failed = 0;
let passed = 0;

function run(label, args, input, env = {}) {
  const child = spawnSync("node", args, {
    input,
    encoding: "utf8",
    cwd: repoRoot,
    env: { ...process.env, ...env },
  });
  return { label, stdout: child.stdout ?? "", stderr: child.stderr ?? "", code: child.status };
}

function expectEmpty(label, result) {
  if (result.stdout.trim() === "" && result.code === 0) {
    passed++;
    console.log(`  ok  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}`);
    console.log(`       exit=${result.code} stdout=${result.stdout.slice(0, 200)}`);
  }
}

function expectContains(label, result, needle) {
  if (result.stdout.includes(needle) && result.code === 0) {
    passed++;
    console.log(`  ok  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}`);
    console.log(`       expected substring: ${needle}`);
    console.log(`       exit=${result.code} stdout=${result.stdout.slice(0, 200)}`);
  }
}

function expectJsonField(label, result, path, expected) {
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    failed++;
    console.log(`  FAIL ${label} (stdout not JSON)`);
    return;
  }
  let value = parsed;
  for (const key of path) value = value?.[key];
  if (value === expected) {
    passed++;
    console.log(`  ok  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}`);
    console.log(`       expected ${path.join(".")}=${expected}, got ${JSON.stringify(value)}`);
  }
}

const j = (obj) => JSON.stringify(obj);

console.log("user_prompt_harness_context");
expectContains(
  "prompt with 'feature' keyword injects context",
  run("user_prompt_feature", [hooks("user_prompt_harness_context.mjs")], j({ hook_event_name: "UserPromptSubmit", prompt: "add a new feature for X" })),
  "docs/harness/HARNESS_OPERATING_PLAYBOOK.md",
);
expectContains(
  "prompt with slash command injects context",
  run("user_prompt_slash", [hooks("user_prompt_harness_context.mjs")], j({ hook_event_name: "UserPromptSubmit", prompt: "/harness-start fever-time" })),
  "docs/harness/HARNESS_OPERATING_PLAYBOOK.md",
);
expectContains(
  "/harness-maintain slash command injects context",
  run("user_prompt_harness_maintain", [hooks("user_prompt_harness_context.mjs")], j({ hook_event_name: "UserPromptSubmit", prompt: "/harness-maintain A" })),
  "docs/harness/HARNESS_OPERATING_PLAYBOOK.md",
);
expectContains(
  "prompt referencing src/ path injects context",
  run("user_prompt_path", [hooks("user_prompt_harness_context.mjs")], j({ hook_event_name: "UserPromptSubmit", prompt: "fix bug in src/state.ts" })),
  "docs/harness/HARNESS_OPERATING_PLAYBOOK.md",
);
expectContains(
  "Korean 하네스 keyword injects context",
  run("user_prompt_ko", [hooks("user_prompt_harness_context.mjs")], j({ hook_event_name: "UserPromptSubmit", prompt: "하네스 구조를 평가해줘" })),
  "docs/harness/HARNESS_OPERATING_PLAYBOOK.md",
);
expectEmpty(
  "trivial prompt skips injection",
  run("user_prompt_trivial", [hooks("user_prompt_harness_context.mjs")], j({ hook_event_name: "UserPromptSubmit", prompt: "x" })),
);
expectEmpty(
  "unrelated prompt skips injection",
  run("user_prompt_unrelated", [hooks("user_prompt_harness_context.mjs")], j({ hook_event_name: "UserPromptSubmit", prompt: "what time is it" })),
);
expectEmpty(
  "invalid JSON exits silently",
  run("user_prompt_invalid", [hooks("user_prompt_harness_context.mjs")], "not json"),
);

console.log("session_status_snapshot");
expectJsonField(
  "echoes hook_event_name",
  run("session_pre", [hooks("session_status_snapshot.mjs")], j({ hook_event_name: "PreCompact" })),
  ["hookSpecificOutput", "hookEventName"],
  "PreCompact",
);
expectJsonField(
  "defaults to SessionStart on empty",
  run("session_empty", [hooks("session_status_snapshot.mjs")], ""),
  ["hookSpecificOutput", "hookEventName"],
  "SessionStart",
);

console.log("pre_tool_bash_guard");
expectJsonField(
  "rm -rf is denied",
  run("bash_deny", [hooks("pre_tool_bash_guard.mjs")], j({ tool_input: { command: "rm -rf /tmp/x" } })),
  ["hookSpecificOutput", "permissionDecision"],
  "deny",
);
expectJsonField(
  "git push --force is denied",
  run("bash_force", [hooks("pre_tool_bash_guard.mjs")], j({ tool_input: { command: "git push origin main --force" } })),
  ["hookSpecificOutput", "permissionDecision"],
  "deny",
);
expectJsonField(
  "git push -f is denied",
  run("bash_f", [hooks("pre_tool_bash_guard.mjs")], j({ tool_input: { command: "git push -f origin main" } })),
  ["hookSpecificOutput", "permissionDecision"],
  "deny",
);
expectEmpty(
  "git push --force-with-lease passes",
  run("bash_lease", [hooks("pre_tool_bash_guard.mjs")], j({ tool_input: { command: "git push --force-with-lease origin main" } })),
);
expectEmpty(
  "plain git push passes",
  run("bash_push", [hooks("pre_tool_bash_guard.mjs")], j({ tool_input: { command: "git push origin main" } })),
);
expectJsonField(
  "npm install asks",
  run("bash_npm", [hooks("pre_tool_bash_guard.mjs")], j({ tool_input: { command: "npm install vite" } })),
  ["hookSpecificOutput", "permissionDecision"],
  "ask",
);
expectEmpty(
  "git status passes",
  run("bash_status", [hooks("pre_tool_bash_guard.mjs")], j({ tool_input: { command: "git status" } })),
);

console.log("pre_tool_privacy_guard");
expectJsonField(
  "keyCode in source asks",
  run(
    "privacy_hit",
    [hooks("pre_tool_privacy_guard.mjs")],
    j({ tool_input: { file_path: "src/x.ts", content: "const keyCode = e.keyCode;" } }),
  ),
  ["hookSpecificOutput", "permissionDecision"],
  "ask",
);
expectEmpty(
  "keyCode inside markdown is ignored",
  run(
    "privacy_md",
    [hooks("pre_tool_privacy_guard.mjs")],
    j({ tool_input: { file_path: "docs/x.md", content: "do not store keyCode anywhere" } }),
  ),
);
expectEmpty(
  "keyCodec partial match ignored (word boundary)",
  run(
    "privacy_partial",
    [hooks("pre_tool_privacy_guard.mjs")],
    j({ tool_input: { file_path: "src/x.ts", content: "const keyCodec = 1" } }),
  ),
);
expectEmpty(
  "clean source passes",
  run(
    "privacy_clean",
    [hooks("pre_tool_privacy_guard.mjs")],
    j({ tool_input: { file_path: "src/x.ts", content: "const counter = 0;" } }),
  ),
);

console.log("post_edit_quality_gate");
expectContains(
  "setTimeout in source triggers lifecycle hint",
  run(
    "post_lifecycle",
    [hooks("post_edit_quality_gate.mjs")],
    j({ tool_input: { file_path: "src/x.ts", content: "setTimeout(() => {}, 100);" } }),
  ),
  "lifecycle cleanup",
);
expectContains(
  "settings.json edit triggers self-maintenance (not UI hint)",
  run(
    "post_settings_json",
    [hooks("post_edit_quality_gate.mjs")],
    j({ tool_input: { file_path: ".claude/settings.json", content: "{\"settings\": true}" } }),
  ),
  "Harness self-maintenance mode",
);
expectEmpty(
  "markdown doc edit is skipped",
  run(
    "post_md",
    [hooks("post_edit_quality_gate.mjs")],
    j({ tool_input: { file_path: "docs/x.md", content: "## Settings\nclick the button" } }),
  ),
);
expectEmpty(
  "clean ts edit passes",
  run(
    "post_clean",
    [hooks("post_edit_quality_gate.mjs")],
    j({ tool_input: { file_path: "src/x.ts", content: "const x = 1;" } }),
  ),
);
expectContains(
  "css edit triggers stylelint advisory",
  run(
    "post_css_advisory",
    [hooks("post_edit_quality_gate.mjs")],
    j({ tool_input: { file_path: "src/styles/dashboard.css", content: ".x { color: red; }" } }),
  ),
  "Stylelint advisory",
);
expectContains(
  "harness hook edit triggers self-maintenance checklist",
  run(
    "post_harness_hook",
    [hooks("post_edit_quality_gate.mjs")],
    j({ tool_input: { file_path: ".claude/hooks/example.mjs", content: "// noop" } }),
  ),
  "Harness self-maintenance mode",
);
expectContains(
  "design-rule.md edit triggers self-maintenance checklist",
  run(
    "post_harness_designrule",
    [hooks("post_edit_quality_gate.mjs")],
    j({ tool_input: { file_path: ".claude-context/design-rule.md", content: "## new section" } }),
  ),
  "Harness self-maintenance mode",
);
expectContains(
  "skills edit triggers self-maintenance checklist",
  run(
    "post_harness_skill",
    [hooks("post_edit_quality_gate.mjs")],
    j({ tool_input: { file_path: ".claude/skills/foo/SKILL.md", content: "---\nname: foo\n---\n" } }),
  ),
  "Harness self-maintenance mode",
);
expectContains(
  "settings.json edit triggers self-maintenance checklist",
  run(
    "post_harness_settings",
    [hooks("post_edit_quality_gate.mjs")],
    j({ tool_input: { file_path: ".claude/settings.json", content: "{}" } }),
  ),
  "Harness self-maintenance mode",
);
expectContains(
  "docs/harness edit triggers self-maintenance checklist",
  run(
    "post_harness_doc",
    [hooks("post_edit_quality_gate.mjs")],
    j({ tool_input: { file_path: "docs/harness/HARNESS_OPERATING_PLAYBOOK.md", content: "## update" } }),
  ),
  "Harness self-maintenance mode",
);
expectEmpty(
  "regular src/ edit does not trigger self-maintenance",
  run(
    "post_src_no_self_maint",
    [hooks("post_edit_quality_gate.mjs")],
    j({ tool_input: { file_path: "src/utils/format.ts", content: "export const x = 1;" } }),
  ),
);
expectEmpty(
  "non-harness docs edit does not trigger self-maintenance",
  run(
    "post_docs_no_self_maint",
    [hooks("post_edit_quality_gate.mjs")],
    j({ tool_input: { file_path: "docs/feat_example_notes.md", content: "## notes" } }),
  ),
);
expectContains(
  "s1 doc save triggers Quality Oracle checklist",
  run(
    "post_s1_trigger",
    [hooks("post_edit_quality_gate.mjs")],
    j({ tool_input: { file_path: "docs/feat_test-feat_s1.md", content: "## Context Carry\n| 항목 | 결정 |" } }),
  ),
  "Quality Oracle",
);
expectEmpty(
  "non-feat _s1 file does not trigger Quality Oracle",
  run(
    "post_non_feat_s1",
    [hooks("post_edit_quality_gate.mjs")],
    j({ tool_input: { file_path: "docs/random_notes_s1.md", content: "some notes" } }),
  ),
);
expectEmpty(
  "s0 doc save does not trigger s1 Oracle",
  run(
    "post_s0_no_trigger",
    [hooks("post_edit_quality_gate.mjs")],
    j({ tool_input: { file_path: "docs/feat_test-feat_s0.md", content: "## Ideation notes" } }),
  ),
);
expectContains(
  "s2 doc save triggers Harness Readiness checklist",
  run(
    "post_s2_trigger",
    [hooks("post_edit_quality_gate.mjs")],
    j({ tool_input: { file_path: "docs/feat_test-feat_s2.md", content: "## Phase A\n전제조건:" } }),
  ),
  "Harness Readiness Oracle",
);
expectEmpty(
  "generic design doc does not trigger s2 Oracle",
  run(
    "post_design_no_trigger",
    [hooks("post_edit_quality_gate.mjs")],
    j({ tool_input: { file_path: "docs/feat_test-feat_notes.md", content: "## Notes" } }),
  ),
);

console.log("stop_exit_check");
expectEmpty(
  "all docs present passes",
  run("stop_present", [hooks("stop_exit_check.mjs")], ""),
);
{
  const tempLedger = resolve(repoRoot, "docs/feat_test-retro-check_harness_ledger.md");
  writeFileSync(tempLedger, "# Test Ledger\n");
  try {
    expectContains(
      "Ledger without Retrospective emits warn",
      run("stop_retro_warn", [hooks("stop_exit_check.mjs")], ""),
      "Retrospective",
    );
  } finally {
    unlinkSync(tempLedger);
  }
}
expectEmpty(
  "no Ledger present exits cleanly without warn",
  run("stop_no_ledger", [hooks("stop_exit_check.mjs")], ""),
);
{
  const tempLedger3 = resolve(repoRoot, "docs/feat_test-inprogress_harness_ledger.md");
  writeFileSync(
    tempLedger3,
    "# Test Ledger\n\n## Phase Status\n| Phase | 상태 | 완료 커밋 |\n|---|---|---|\n| Phase 1 | ✅ 완료 | abc123 |\n| Phase 2 | 🔄 진행 중 | — |\n",
  );
  try {
    expectEmpty(
      "Ledger with in-progress phase skips Retrospective warn",
      run("stop_inprogress_ledger", [hooks("stop_exit_check.mjs")], ""),
    );
  } finally {
    unlinkSync(tempLedger3);
  }
}

console.log("cost_ledger");
expectEmpty(
  "cost_ledger exits cleanly with no active cycle",
  run("cost_ledger_no_cycle", [hooks("cost_ledger.mjs")], "", {}),
);
expectEmpty(
  "cost_ledger exits cleanly with empty HARNESS_LOOP_CYCLE_ID",
  run("cost_ledger_empty_id", [hooks("cost_ledger.mjs")], "", { HARNESS_LOOP_CYCLE_ID: "" }),
);

console.log("subagent_stop_merge");
expectJsonField(
  "non-strict emits advisory additionalContext",
  run("sub_advisory", [hooks("subagent_stop_merge.mjs")], "", { PIXEL_HORIZON_STRICT_STOP: "" }),
  ["hookSpecificOutput", "hookEventName"],
  "SubagentStop",
);
expectJsonField(
  "strict mode blocks",
  run("sub_strict", [hooks("subagent_stop_merge.mjs")], "", { PIXEL_HORIZON_STRICT_STOP: "1" }),
  ["decision"],
  "block",
);

console.log("harness-effort-collect");
{
  const tmpDir = resolve(repoRoot, "tmp-effort-test");
  const projectsDir = resolve(tmpDir, "projects");
  const ledger = resolve(tmpDir, "ledger.md");
  const jsonl = resolve(projectsDir, "sess.jsonl");
  const { mkdirSync, rmSync, readFileSync } = await import("node:fs");
  mkdirSync(projectsDir, { recursive: true });
  const events = [
    { type: "user", sessionId: "deadbeef0000ffff", gitBranch: "fx-branch", cwd: repoRoot, timestamp: "2026-05-16T10:00:00.000Z", message: { role: "user", content: [{ type: "text", text: "hi" }] } },
    { type: "assistant", sessionId: "deadbeef0000ffff", gitBranch: "fx-branch", cwd: repoRoot, timestamp: "2026-05-16T10:00:30.000Z", message: { role: "assistant", content: [{ type: "text", text: "ok" }], usage: { input_tokens: 1000, output_tokens: 50, cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 2000 }, cache_read_input_tokens: 15000 } } },
  ];
  writeFileSync(jsonl, events.map((e) => JSON.stringify(e)).join("\n") + "\n");
  writeFileSync(ledger, "# fx\n<!-- effort:auto:begin -->\n<!-- effort:auto:end -->\nKEEPME\n");
  try {
    const res = run(
      "effort_collect_populate",
      [resolve(repoRoot, "scripts/harness-effort-collect.mjs"), "--ledger", ledger, "--phase", "A", "--branch", "fx-branch", "--projects-dir", projectsDir, "--repo-root", repoRoot],
      "",
    );
    const out = readFileSync(ledger, "utf8");
    if (res.code === 0 && out.includes("| A | 0.5 |") && out.includes("Sessions: deadbeef") && out.includes("KEEPME")) {
      passed++;
      console.log("  ok  populates Effort Ledger row + preserves body outside sentinels");
    } else {
      failed++;
      console.log("  FAIL populates Effort Ledger row");
      console.log(`       exit=${res.code} ledger=${out.slice(0, 300)}`);
    }
    writeFileSync(ledger, "# fx\n<!-- effort:auto:begin -->\n<!-- effort:auto:end -->\n");
    const res2 = run(
      "effort_collect_fallback",
      [resolve(repoRoot, "scripts/harness-effort-collect.mjs"), "--ledger", ledger, "--phase", "B", "--branch", "no-match", "--projects-dir", resolve(tmpDir, "missing"), "--repo-root", repoRoot],
      "",
    );
    const out2 = readFileSync(ledger, "utf8");
    if (res2.code === 0 && /\| B \| n\/a \|/.test(out2)) {
      passed++;
      console.log("  ok  JSONL absent → n/a row, exit 0 (advisory)");
    } else {
      failed++;
      console.log("  FAIL JSONL absent fallback");
      console.log(`       exit=${res2.code} ledger=${out2.slice(0, 200)}`);
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log("pre_tool_effort_collect");
{
  const { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } = await import("node:fs");
  // Case 1: non-git-commit Bash → silent noop.
  const r1 = run(
    "effort_hook_noop_non_git",
    [hooks("pre_tool_effort_collect.mjs")],
    j({ tool_input: { command: "ls -la" } }),
  );
  expectEmpty("non-git-commit Bash → silent noop", r1);
  // Case 2: git commit without Ledger marker → silent noop.
  const r2 = run(
    "effort_hook_noop_no_marker",
    [hooks("pre_tool_effort_collect.mjs")],
    j({ tool_input: { command: 'git commit -m "feat: unrelated"' } }),
  );
  expectEmpty("git commit without Ledger marker → silent noop", r2);
  // Case 3: Ledger marker but no matching ledger file → silent noop (advisory).
  const r3 = run(
    "effort_hook_noop_no_ledger",
    [hooks("pre_tool_effort_collect.mjs")],
    j({ tool_input: { command: 'git commit -m "Ledger: Phase ZZ9 완료"' } }),
  );
  expectEmpty("Ledger marker but no matching ledger → silent noop", r3);
  // Case 4: extra whitespace around 'Ledger:' / 'Phase' → still parsed, still noop (no real ledger).
  const r4 = run(
    "effort_hook_whitespace",
    [hooks("pre_tool_effort_collect.mjs")],
    j({ tool_input: { command: 'git commit -m "  Ledger:   Phase  ZZ9   완료"' } }),
  );
  expectEmpty("Ledger marker with extra whitespace → silent noop", r4);
  // Case 5: lowercase phase id → pattern requires uppercase; should not match.
  const r5 = run(
    "effort_hook_lowercase",
    [hooks("pre_tool_effort_collect.mjs")],
    j({ tool_input: { command: 'git commit -m "Ledger: Phase a1 done"' } }),
  );
  expectEmpty("lowercase phase id → pattern does not match, noop", r5);
  // Case 6: 'Ledger' without colon → pattern does not match.
  const r6 = run(
    "effort_hook_no_colon",
    [hooks("pre_tool_effort_collect.mjs")],
    j({ tool_input: { command: 'git commit -m "Ledger Phase A done"' } }),
  );
  expectEmpty("'Ledger' without colon → pattern does not match", r6);
  // Case 7: phase id at the 4-char upper bound (A0B1) → matches but no ledger → noop.
  const r7 = run(
    "effort_hook_4char_phase",
    [hooks("pre_tool_effort_collect.mjs")],
    j({ tool_input: { command: 'git commit -m "Ledger: Phase A0B1 완료"' } }),
  );
  expectEmpty("4-char phase id matches pattern → noop (no ledger)", r7);
}

console.log("_emit helpers");
{
  const emitPath = resolve(repoRoot, ".claude/hooks/_emit.mjs");
  const advisoryProbe = `import { emitAdvisory } from "${emitPath}"; emitAdvisory("TestEvent", "hello world");`;
  const advisoryResult = run("emit_advisory", ["-e", advisoryProbe], "");
  expectJsonField("emitAdvisory writes hookSpecificOutput.hookEventName", advisoryResult, ["hookSpecificOutput", "hookEventName"], "TestEvent");
  expectJsonField("emitAdvisory writes hookSpecificOutput.additionalContext", advisoryResult, ["hookSpecificOutput", "additionalContext"], "hello world");

  const decisionProbe = `import { emitDecision } from "${emitPath}"; emitDecision("deny", "blocked reason");`;
  const decisionResult = run("emit_decision", ["-e", decisionProbe], "");
  expectJsonField("emitDecision writes permissionDecision", decisionResult, ["hookSpecificOutput", "permissionDecision"], "deny");
  expectJsonField("emitDecision writes permissionDecisionReason", decisionResult, ["hookSpecificOutput", "permissionDecisionReason"], "blocked reason");
  expectJsonField("emitDecision sets hookEventName to PreToolUse", decisionResult, ["hookSpecificOutput", "hookEventName"], "PreToolUse");
}

console.log("_config loader");
{
  const probe = `import { loadHarnessConfig, getRequiredDocs, getStrictMode } from "${resolve(repoRoot, ".claude/hooks/_config.mjs")}";\n` +
    `const cfg = loadHarnessConfig();\n` +
    `const docs = getRequiredDocs(["fallback"]);\n` +
    `const cfg2 = loadHarnessConfig();\n` +
    `process.stdout.write(JSON.stringify({ has_required_docs: Array.isArray(cfg?.required_docs), docs_count: docs.length, strict_default: getStrictMode(), same_ref: cfg === cfg2 }));`;
  const r = run("config_probe", ["-e", probe], "");
  expectContains("loadHarnessConfig reads required_docs from harness-loop.config.json", r, '"has_required_docs":true');
  expectContains("getRequiredDocs returns config list (≥5)", r, '"docs_count":5');
  expectContains("getStrictMode returns false by default", r, '"strict_default":false');
  expectContains("loadHarnessConfig returns cached object on second call", r, '"same_ref":true');
}

console.log("");
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
