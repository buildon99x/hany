---
role: behavior
portability: portable
---

# Harness Self-Maintenance Guide

> 본 문서는 **harness 자체를 수정**할 때만 적용된다. 일반 feature 작업은 `docs/harness/HARNESS_OPERATING_PLAYBOOK.md` 와 `.claude-context/design-rule.md` 를 따른다.
>
> 진입점: 슬래시 `/harness-maintain` 또는 `PostToolUse(Edit|Write)` 자동 hook (`.claude/hooks/`, `.claude-context/`, `.claude/skills/`, `.claude/commands/`, `docs/harness/`, `.claude/settings.json` 편집 시).

## 적용 범위

다음 경로 중 하나라도 건드리면 본 가이드가 활성된다.

| 경로 | 영향 범위 |
|---|---|
| `.claude/hooks/*.mjs` | 모든 후속 세션의 자동 동작 |
| `.claude/settings.json` | hook 등록·permissions·MCP 활성화 |
| `.claude-context/design-rule.md` | Stage 0/1/2 워크플로우 전체 |
| `.claude/skills/**` | Claude 가 자동 발견하는 능력 정의 |
| `.claude/commands/**` | 사용자 슬래시 진입점 |
| `docs/harness/HARNESS_OPERATING_PLAYBOOK.md` | feature 진입 절차 |
| `docs/harness/GLOSSARY.md` | 공유 어휘 |
| `docs/harness/HARNESS_LEDGER_TEMPLATE.md` · `HARNESS_RETROSPECTIVE_TEMPLATE.md` | runtime 산출물 포맷 |
| `docs/harness/CLAUDE_CODE_HARNESS_APPLY.md` | 외부 이식 가이드 |
| `docs/harness/FEATURE_DIFFICULTY_TIERS.md` · `QUALITY_GATE_MATRIX.md` 외 템플릿 | 모든 신규 feature 작업 |

## Non-Negotiables (harness 전용)

1. **Hook 변경 = `npm run hooks:test` 통과 필수**. 신규 동작 분기마다 양/음성 케이스 동시 추가. 통과 전 commit 금지.
2. **Hook 은 fail-safe 로 동작한다**. JSON 파싱 실패·stdin 결손·예외 모두 `process.exit(0)` 로 끝낸다. 차단(`deny`/`block`)은 의도된 정책에만 사용.
3. **`process.exit(0)` 후 stdout 비움 ≠ skip**. 차단 의도가 있으면 명시적 `permissionDecision` JSON 을 stdout 으로 출력한 뒤 종료.
4. **Cross-platform**: hook 스크립트는 Windows/macOS/Linux 모두에서 Node 18+ 로 동작해야 한다. shell-specific syntax 금지.
5. **자기 적용 회귀 점검**: design-rule.md 또는 SKILL 룰을 추가할 때, 그 룰을 본 PR 자체에 소급 적용했을 때 깨지지 않는지 확인 (grandfathering 명시 의무).
6. **Footnote 발효일 보호**: §6 Footnote 발효일은 머지 commit ISO8601 시각으로만 채운다. 사전 작성·임의 시각 금지. 미발효 placeholder 상태에서 advisory 게이트를 blocking 으로 격상하지 않는다.
7. **`/stage-*` · `/harness-*` 슬래시 = 사용자 트리거**. Claude 가 자동 호출하지 않는다.

## 편집 카테고리별 체크리스트

### A. `.claude/hooks/*.mjs` 편집

- [ ] 변경한 정규식/조건 분기마다 `test-hooks.mjs` 케이스 추가 (positive + negative).
- [ ] 새 deny 패턴 추가 시 `--force-with-lease` 같은 안전한 변형이 false-positive 되지 않는지 검증.
- [ ] stdin JSON 형식 가정을 코드 주석으로 명시 (`tool_input.command`, `tool_input.file_path` 등).
- [ ] `npm run hooks:test` 0 실패 확인 후 commit.
- [ ] hook 동작이 변경되면 `docs/harness/CLAUDE_CODE_HARNESS_APPLY.md` Hook Behavior 섹션도 같은 commit 에서 업데이트.

### B. `.claude/settings.json` 편집

- [ ] hook 추가 시: 파일이 실제 존재하는지 `ls .claude/hooks/<name>.mjs` 로 확인.
- [ ] `matcher` 패턴은 Claude Code 명세 (`Bash`, `Edit|Write`, `Bash(git commit:*)`) 만 사용.
- [ ] `permissions.deny` 추가 시 기존 작업이 의도치 않게 차단되지 않는지 grep 으로 영향 확인.
- [ ] MCP/plugin 활성화 시 외부 전송 위험 사전 평가 (Gemini MCP 사례 참조 — `CLAUDE.md` Plan Review).

### C. `.claude-context/design-rule.md` 편집

- [ ] 룰 추가는 **반드시 §6 advisory 묶음** 으로 시작 — 즉시 blocking 게이트 도입 금지.
- [ ] Footnote 신설 시 발효일 placeholder + auto-expire 절차 + 발동 카운트 측정 방법 3종 모두 명시.
- [ ] 룰 본문이 자기 자신에게 회귀 적용되는지 검토 (grandfathered 명시 의무).
- [ ] 30일 freeze 권장 — 머지 후 추가 룰 변경 지양.
- [ ] 의무 산출물 표 변경 시 `harness-entry/SKILL.md` Readiness Validation 도 동기 업데이트.

### D. `.claude/skills/**` 편집

- [ ] 디렉토리형 (`*/SKILL.md`) ↔ 평면형 (`*.md`) 구조 일관성 유지. 신규 skill 은 디렉토리형 권장.
- [ ] 프론트매터 `name`·`description` 누락 금지 — Claude Code 의 자동 발견에 필요.
- [ ] SKILL 본문이 참조하는 외부 경로(`docs/harness/...`, `.claude-context/...`) 존재 확인.
- [ ] skill 동작이 외부 IO (web fetch / MCP / 광역 grep) 를 유발하면 design-rule.md §5.4 위임 단일 임계 (≥50K char, Footnote 5로 OR 4중 축소) 안내.

### E. `.claude/commands/**` 편집

- [ ] 커맨드 파일은 **얇은 라우터** 유지 — 절차 본문은 design-rule.md 또는 SKILL.md 에만 둔다 (중복 금지).
- [ ] `$ARGUMENTS` 파싱 절차를 design-rule.md §2.3 와 일치시킨다.
- [ ] 신규 슬래시는 `CLAUDE.md` Design Workflow 섹션 + 본 가이드 적용 범위 표에 추가.

### F. `docs/harness/**` 편집

- [ ] Playbook ↔ design-rule.md ↔ Apply Guide ↔ README 4중 동기화 — 같은 commit 에서 모순 제거.
- [ ] Glossary 신규 용어 도입 시 해당 용어 사용처에 1회 이상 inbound link.
- [ ] Template (`HARNESS_LEDGER_TEMPLATE.md` / `HARNESS_RETROSPECTIVE_TEMPLATE.md`) 변경 시 기존 ledger/retro 파일 호환 확인 — 필드 추가는 옵셔널 default, 필드 제거는 마이그레이션 메모.

## Loop Budget (harness 자기 수정)

- 동일 hook 테스트 실패 **3회 연속 auto-fix → stop & ask**.
- 동일 design-rule.md 절 **9일 5회 변경 = 안티패턴** (lesson 2026-05-09 참조). 한 PR 묶음으로 통합.
- 같은 advisory Footnote 를 발효 전에 본문 수정 **2회 도달 = stop**, 사용자 결정 대기.

## Stop Conditions (harness 자기 수정 전용)

다음 상황에서는 즉시 중단하고 사용자 결정을 받는다.

- Hook 동작이 모든 세션을 차단(`block`) 또는 `deny` 로 만드는 변경.
- design-rule.md §3 의무 산출물 표를 줄이는 방향 (게이트 약화).
- Footnote 발효일 placeholder 를 임의 시각으로 채우는 경우.
- SKILL.md frontmatter `name` 변경 (Claude Code 의 자동 발견 식별자 충돌 가능).
- `.claude/settings.json` 의 `permissions.deny` 확장이 기존 워크플로우를 깨는 경우.
- 동일 룰을 9일 내 5회 이상 손대게 되는 상황.

## 핸드오프

harness 자기 수정 작업은 일반 feature 작업과 달리 **Feature Quality Note 면제** 가능. 다만 다음은 commit 본문에 명시:

1. 변경 카테고리 (A~F 중 어느 것).
2. `npm run hooks:test` 결과 (passed/failed 수).
3. 자기 적용 회귀 가능성 (있다면 grandfathered 명시).
4. 동기 업데이트한 문서 목록 (Playbook / Apply Guide / README / Glossary 중).

---

## 연동

- 자동 진입: `.claude/hooks/post_edit_quality_gate.mjs` — 위 적용 범위 경로 매치 시 체크리스트 alert.
- 명시 진입: `.claude/commands/harness-maintain.md` — 세션 전체를 harness 유지보수 모드로 선언.
- 본 가이드는 `docs/harness/HARNESS_OPERATING_PLAYBOOK.md` 의 보조 문서다. Playbook 이 feature 작업 절차를 정의하는 것과 동일한 위상으로 harness 자기 수정 절차를 정의한다.
