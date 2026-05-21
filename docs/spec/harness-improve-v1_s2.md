---
kind: feat
name: harness-improve-v1
stage: 2
status: active
---

# Harness Improve v1 — Stage 2 구현 계획

> Stage 1 문서: `docs/spec/harness-improve-v1_s1.md`

## 1. Phase 분할 (2 Phase)

s1 §8 권장안 채택. 사전 `[T]` 추정 미적용 (외부 IO < 3, 광역 grep < 4).

---

## Phase A — design-rule.md 본문 추가

**작업 요지**: §3 의무 산출물 표 영향파일 행 우측 "사전 grep" 권장 1줄 / §5.4 위임 임계 OR 4중 아래 "위임 방식 2분기 명시" 1줄 / §6 Footnote 4 신설 (G1·G2 묶음).

**전제조건**
- s1 §3 영향 파일 표 #1 확정.
- design-rule.md §6 Footnote 1·2·3 placeholder 패턴 일관 확인.

**인수조건**
1. [verify: grep] 이 Phase 단독으로 main 머지 시 빌드·테스트 통과 — design-rule.md 단일 파일 변경, 타 파일 의존 없음 (단일 verifiable Phase).
2. [verify: grep] `grep -n 'pre-grep' .claude-context/design-rule.md` ≥ 1 매치.
3. [verify: grep] `grep -nE 'mode: (subagent|main-batch)' .claude-context/design-rule.md` ≥ 1 매치.
4. [verify: grep] `grep -n 'Footnote 4' .claude-context/design-rule.md` == 1 + `grep -n '<merge-commit-iso8601>' .claude-context/design-rule.md` ≥ 1.
5. [verify: hooks:test] `npm run hooks:test` → 67 passed 유지.

**루프예산**: 자동 수정 3회 / 동일 입력 재실행 2회.

**롤백**: `git revert <Phase A commit>` — 단일 파일 단일 커밋.

**서브에이전트 스코프**
- `mode: main-direct` (단일 파일, ~30줄 추가 — 위임 임계 미달).
- 작업 파일: `.claude-context/design-rule.md`.
- 참조 s1 섹션: §2 (게이트 정의) / §3 영향 파일 표 #1 / §4 Context Carry.

**에스컬레이트 조건**
- 루프예산 초과.
- Footnote 4 placeholder 형식이 Footnote 1·2·3 과 비호환 발견 시.
- §6 본문 변경이 Footnote 3 발효 이후 30일 freeze 권장 위반 판정 시.

---

## Phase B — 4중 동기 + harness-entry SKILL 갱신

**작업 요지**: harness-entry SKILL Readiness Validation item 6·7 신설 / OPERATING_PLAYBOOK·APPLY 요약 추가 / SUBAGENT_DELEGATION_GUIDE 서두 1줄.

**전제조건**
- Phase A ✅ 완료 — design-rule.md §6 Footnote 4 본문 확정.

**인수조건**
1. [verify: grep] Phase A·B 묶음 단일 PR 머지 시 빌드·테스트 통과 (비-verifiable 단일 Phase — Phase A 와 단일 PR 명시).
2. [verify: grep] `grep -n 'pre-grep-trigger' .claude/skills/harness-entry/SKILL.md` == 1.
3. [verify: grep] `grep -n 'delegation-mode-trigger' .claude/skills/harness-entry/SKILL.md` == 1.
4. [verify: grep] `grep -n 'pre-grep-trigger\|delegation-mode-trigger' docs/harness/HARNESS_OPERATING_PLAYBOOK.md` ≥ 1.
5. [verify: grep] `grep -n 'pre-grep-trigger\|delegation-mode-trigger' docs/harness/CLAUDE_CODE_HARNESS_APPLY.md` ≥ 1.
6. [verify: grep] `grep -n 'Footnote 4' docs/harness/SUBAGENT_DELEGATION_GUIDE.md` 5~15행 범위 == 1.
7. [verify: hooks:test] `npm run hooks:test` → 67 passed 유지.
8. [verify: grep] 4중 동기 누락 0 — `grep -rL 'pre-grep-trigger' .claude-context/design-rule.md .claude/skills/harness-entry/SKILL.md docs/harness/HARNESS_OPERATING_PLAYBOOK.md docs/harness/CLAUDE_CODE_HARNESS_APPLY.md` 결과 0 라인.

**루프예산**: 자동 수정 3회 / 동일 입력 재실행 2회.

**롤백**: Phase A·B 단일 PR `git revert` — Phase B 인수조건 #1 에 단일 PR 명시.

**서브에이전트 스코프**
- `mode: main-batch` — 본 feature 가 G2 dogfooding. 4중 동기 4파일이지만 단순 키워드 1~2줄 추가만 → 메인 Edit 직접 + 검증 grep 메인 Bash.
- 작업 파일: `.claude/skills/harness-entry/SKILL.md` / `docs/harness/HARNESS_OPERATING_PLAYBOOK.md` / `docs/harness/CLAUDE_CODE_HARNESS_APPLY.md` / `docs/harness/SUBAGENT_DELEGATION_GUIDE.md`.
- 참조 s1 섹션: §3 영향 파일 표 #2~#5.

**에스컬레이트 조건**
- 루프예산 초과.
- CLAUDE_CODE_HARNESS_APPLY.md 의 advisory 게이트 목록 형식이 1~2줄 추가가 불가능한 구조일 경우.
- hooks:test 회귀 발생.

---

## 2. 테스트 체크리스트

- `npm run hooks:test` Phase A·B 양쪽 전후 67 passed 유지.
- 각 Phase 인수조건 grep 명령 메인 Bash 실제 실행 → 매치 카운트 확인.
- `git diff main` 에서 영향 파일 5개 모두 출현 확인.

## 3. 안전장치·롤백

- Phase A·B 단일 PR 머지 (Phase B 인수조건 #1 명시).
- advisory 차단 게이트 승격 금지 — Footnote 4 본문에 명시.
- 발효일 placeholder 유지 — 머지 직후 별도 1줄 follow-up commit (`docs(harness): activate §6 Footnote 4`).

## 4. 리스크·열린 이슈

- **R1** Footnote 3 30일 freeze 권장 + Footnote 4 동시 design-rule 변경 — Phase A 전제조건에서 Footnote 3 placeholder 미발효 상태 확인 후 진행.
- **R2** CLAUDE_CODE_HARNESS_APPLY.md advisory 게이트 목록 형식 미확정 — Phase B 실행 시 첫 30줄 Read 로 확인 후 위치 결정.
- **R3** G2 `mode:` prefix 기존 관행과 다름 — Footnote 4 본문에 "발효일 이후 신규 feature 부터" 명시.
