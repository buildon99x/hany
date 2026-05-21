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

const input = event?.tool_input ?? {};
const filePath = String(input.file_path ?? "");

// Harness self-modification: paths that govern all future sessions or every
// feature workflow. Surfacing the self-maintenance checklist whenever Claude
// touches them gives the same coverage as remembering to run /harness-maintain.
const harnessSelfModPatterns = [
  /(^|\/)\.claude\/hooks\//,
  /(^|\/)\.claude\/settings(\.local)?\.json$/,
  /(^|\/)\.claude-context\//,
  /(^|\/)\.claude\/skills\//,
  /(^|\/)\.claude\/commands\//,
  /(^|\/)docs\/harness\//,
];
const harnessSelfMod = harnessSelfModPatterns.some((re) => re.test(filePath));

if (harnessSelfMod) {
  emitAdvisory(
    "PostToolUse",
    "Harness self-maintenance mode (path matched .claude/hooks · .claude/settings.json · .claude-context · .claude/skills · .claude/commands · docs/harness):\n" +
      "- Apply docs/harness/HARNESS_SELF_MAINTENANCE.md before continuing — this edit affects every future session or feature workflow.\n" +
      "- Hook edits (.claude/hooks/**) require `npm run hooks:test` to pass before commit, with new positive + negative cases for any changed branch.\n" +
      "- design-stage SKILL changes must use §6 advisory placement; do not promote advisory gates to blocking without §6 procedure.\n" +
      "- Same-commit sync: Playbook ↔ design-stage SKILL ↔ CLAUDE_CODE_HARNESS_APPLY.md ↔ README ↔ Glossary as relevant.\n" +
      "- Loop budget: stop & ask if the same harness rule is touched 5+ times within 9 days (anti-pattern lesson 2026-05-09).",
  );
}

// s1/s2 design doc saves: inject Oracle checklist before source-ext early-exit.
// Path pattern restricted to `docs/spec/*_s[12].md`.
if (/(^|\/)docs\/spec\/.+_s1\.md$/i.test(filePath)) {
  emitAdvisory(
    "PostToolUse",
    "Quality Oracle — s1 저장 확인:\n" +
      "- Context Carry 섹션 존재 + 결정 항목 ≥2개 (s1 Q6)\n" +
      "- ATK 답변 기록 (Medium = 의무 2 + 권장 2 / High = 4 전체 의무)\n" +
      "- 인수조건 ≥2개 검증 가능한 형태로 명시\n" +
      "- §6 영향 파일 표에 전제조건 열 포함\n" +
      "- 누락 항목 확인 후 저장 완료 처리.",
  );
}

if (/(^|\/)docs\/spec\/.+_s2\.md$/i.test(filePath)) {
  emitAdvisory(
    "PostToolUse",
    "Harness Readiness Oracle — s2 저장 확인:\n" +
      "- 모든 Phase 블록에 6개 필드 완비 (전제조건/인수조건/루프예산/롤백/서브에이전트 스코프/에스컬레이트 조건)\n" +
      "- 서브에이전트 스코프: 파일 목록 + 참조할 s1 섹션 + (Footnote 5 G3, 신규 feature) mode (main/subagent:T1/T2/T3) + trigger 매칭 근거 + Hard Constraint 통과 증거 명시\n" +
      "- Review Response Protocol 섹션 포함 여부 확인\n" +
      "- Decision Ledger 초기화 준비 완료 여부 확인\n" +
      "- 누락 항목 확인 후 저장 완료 처리.",
  );
}

const sourceExt = /\.(ts|tsx|rs|js|mjs|cjs|jsx|css|html)$/i;
if (filePath && !sourceExt.test(filePath)) {
  process.exit(0);
}

// CSS edit advisory — Phase D 통합 (s2 §Phase D, s1 §7).
// 컨텐츠 패턴 검사 무관하게 stylelint 단일 파일 실행 안내.
if (/\.css$/i.test(filePath)) {
  emitAdvisory(
    "PostToolUse",
    "Stylelint advisory — CSS 편집 후 확인:\n" +
      `- 단일 파일 검사: npx stylelint --cache --cache-location node_modules/.cache/stylelint/ ${filePath}\n` +
      "- 위반 발생 시 npm run lint:css:fix 로 자동 수정 시도, 잔여는 수동 처리.\n" +
      "- 글래스모피즘 패턴(겹친 셀렉터)은 의도적이면 stylelint-disable-next-line 코멘트 + 사유 명시.",
  );
}

const content = String(input.content ?? input.new_string ?? "");
if (content.length === 0) {
  process.exit(0);
}

const checks = [];

if (/\b(keyCode|rawKey|typedText|mouseX|mouseY|cursorPath|windowTitle)\b/.test(content)) {
  checks.push("- Run privacy scrubber and update Data Inventory; raw input-like identifiers were touched.");
}
if (/\b(setTimeout|setInterval|addEventListener|new\s+Worker|subscribe|onmessage)\b/.test(content)) {
  checks.push("- Add lifecycle cleanup evidence and consider resident stability tests.");
}
if (/\b(schema_version|migrate|migration|writeFile|readFile|persist|saveState|loadState)\b/i.test(content)) {
  checks.push("- Add contract, migration, rollback, old/new/corrupt/missing-field evidence.");
}
if (/\b(token|secret|api[_-]?key|exec\b|spawn\b|child_process)\b/i.test(content)) {
  checks.push("- Add security boundary review and scrub secret/path/token output.");
}
if (/\b(showModal|Toast|Notification|Dialog|Permission)\b/.test(content)) {
  checks.push("- Update design checklist for default/loading/empty/error/disabled/permission/recovery states.");
}

if (checks.length === 0) {
  process.exit(0);
}

emitAdvisory(
  "PostToolUse",
  "Harness follow-up after edit:\n" +
    checks.join("\n") +
    "\n- Record applicable evidence in docs/harness/HANDOFF_TEMPLATE.md before handoff.",
);
