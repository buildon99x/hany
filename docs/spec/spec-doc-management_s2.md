---
kind: feat
name: spec-doc-management
stage: 2
status: active
---

# Spec Doc Management — Stage 2 Implementation Plan

> Stage 1 문서: `docs/spec/spec-doc-management_s1.md`

## 단일 Slice 확정

cross-cutting 키워드 없음, 외부 IO 없음 → 단일 Slice 가능.  
Phase A·B 는 순서 의존 관계로 분할하되 같은 PR 묶음으로 진행.

---

## Phase A — Hook 경로 패턴 변경 `[T]`

### 전제조건
- `npm run hooks:test` 64 passed, 0 failed (기준선)
- `docs/spec/spec-doc-management_s1.md` 존재

### 작업 범위

| 파일 | 변경 내용 |
|---|---|
| `.claude/hooks/post_edit_quality_gate.mjs` | `docs/feat_*_s1` · `_s2` 패턴 → `docs/spec/*_s1` · `_s2` |
| `.claude/hooks/user_prompt_harness_context.mjs` | 트리거 키워드 `docs/feat_` → `docs/spec/` 교체 |
| `.claude/hooks/stop_exit_check.mjs` | `docs/feat_*_harness_ledger.md` glob → `docs/spec/*_harness_ledger.md` |
| `scripts/test-hooks.mjs` | 신 경로 양/음성 케이스 각 hook 별 추가 (최소 6케이스) |

### 인수조건
1. `[verify: hooks:test]` `npm run hooks:test` ≥70 passed, 0 failed (기존 64 + 신규 ≥6)
2. `[verify: grep]` `grep -r 'docs/feat_' .claude/hooks/` 결과 0줄 — hook 파일 내 구 경로 잔존 없음
3. `[verify: grep]` `grep -l 'docs/spec/' .claude/hooks/*.mjs` 결과 3파일 — 신 경로 적용 확인

### 루프 예산
hook 테스트 실패 auto-fix 3회 → stop & ask

### 롤백
`.claude/hooks/` 3파일 `git restore` → 즉시 기존 64 passed 상태 복구 (파일 이동 없어 완전 롤백)

### 서브에이전트 스코프
- 참조 s1 섹션: 영향 파일 표 (hook 3개 행), ATK #1
- 파일 목록: `.claude/hooks/post_edit_quality_gate.mjs`, `.claude/hooks/user_prompt_harness_context.mjs`, `.claude/hooks/stop_exit_check.mjs`, `scripts/test-hooks.mjs`

### 에스컬레이트 조건
- `user_prompt_harness_context.mjs` 교체 후 하네스 컨텍스트 미주입 사례 (세션 재시작으로 확인)
- 실패 원인이 경로 패턴 외 다른 로직에 있을 경우

---

## Phase B — 문서 4중 동기 + 마이그레이션 `[T]`

### 전제조건
- Phase A 인수조건 3개 모두 통과
- `npm run hooks:test` 0 failed (Phase B 진입 게이트)

### 작업 범위

| 파일 | 변경 내용 |
|---|---|
| `.claude-context/design-rule.md` §5.1 | 경로 컨벤션 갱신 + frontmatter 표준 추가 |
| `.claude/commands/stage-end.md` | 예시 경로 갱신 |
| `.claude/commands/stage-start.md` | 예시 경로 갱신 |
| `.claude/skills/design-stage/SKILL.md` | 예시 경로 갱신 |
| `docs/harness/HARNESS_OPERATING_PLAYBOOK.md` | 경로 언급 갱신 |
| `docs/harness/HARNESS_LEDGER_TEMPLATE.md` | ledger 경로 갱신 |
| `docs/harness/CLAUDE_CODE_HARNESS_APPLY.md` | 경로 언급 갱신 |
| `docs/harness/README.md` | 경로 언급 + `docs/spec/INDEX.md` 진입 링크 추가 |
| `CLAUDE.md` | Design Workflow 경로 갱신 |
| `docs/spec/INDEX.md` | 신규 생성 — harness-improvements · spec-doc-management 2행 |
| `docs/feat_harness-improvements_s0.md` | `git mv` → `docs/spec/harness-improvements_s0.md` + frontmatter 추가 |

### 인수조건
1. `[verify: grep]` `grep -rl 'docs/feat_' .claude-context/ .claude/commands/ .claude/skills/ docs/harness/ CLAUDE.md` 결과 0파일 (`.archive` 제외)
2. `[verify: grep]` `grep -c '| feat |' docs/spec/INDEX.md` ≥ 2
3. `[verify: grep]` `ls docs/feat_*.md 2>/dev/null` 결과 없음 — 구 경로 파일 완전 이동
4. `[verify: hooks:test]` `npm run hooks:test` 0 failed — 마이그레이션 후 재확인

### 루프 예산
동일 파일 동기 실패 3회 → stop & ask

### 롤백
- 문서 변경: `git restore` 전체 복구
- `git mv` 역방향: `git mv docs/spec/harness-improvements_s0.md docs/feat_harness-improvements_s0.md`
- Phase A 상태는 영향 없음

### 서브에이전트 스코프
- 참조 s1 섹션: 영향 파일 표 (문서·design-rule 행), ATK #3·#4, Phase 설계
- 파일 목록: `.claude-context/design-rule.md`, `.claude/commands/stage-end.md`, `.claude/commands/stage-start.md`, `.claude/skills/design-stage/SKILL.md`, `docs/harness/HARNESS_OPERATING_PLAYBOOK.md`, `docs/harness/HARNESS_LEDGER_TEMPLATE.md`, `docs/harness/CLAUDE_CODE_HARNESS_APPLY.md`, `docs/harness/README.md`, `CLAUDE.md`, `docs/spec/INDEX.md`(신규), `docs/feat_harness-improvements_s0.md`
- 10파일 초과 → §5.4 C4 충족 → general-purpose 서브에이전트 위임 권장. 4중 동기(harness 문서 4개) 별도 위임 후 나머지 메인 처리 고려.

### 에스컬레이트 조건
- `design-rule.md` §5.1 변경이 §6 Footnote 본문과 충돌 판단 시 (freeze 위반 여부)
- `git mv` 후 `stop_exit_check.mjs` 가 ledger 경로 못 찾아 세션 차단 시

---

## 테스트 체크리스트

- [ ] Phase A: `npm run hooks:test` ≥70 passed, 0 failed
- [ ] Phase A: `.claude/hooks/` 내 `docs/feat_` 잔존 0줄
- [ ] Phase A: `.claude/hooks/*.mjs` 3파일 모두 `docs/spec/` 포함
- [ ] Phase B: 핵심 참조 파일 `docs/feat_` 잔존 0파일
- [ ] Phase B: `docs/spec/INDEX.md` 2행 이상
- [ ] Phase B: `docs/feat_*.md` 루트 파일 0개
- [ ] Phase B: `npm run hooks:test` 0 failed 재확인

## 안전장치·롤백 요약

- Phase A·B 각각 독립 commit → 어느 시점에서도 `git revert` 가능
- Phase A commit 전 hooks:test 통과 확인 → 실패 시 `git stash` 로 즉시 복구
- Phase B `git mv` 는 문서 동기 commit 과 분리 권장 — 롤백 격리

## 리스크·열린 이슈

| 리스크 | 가능성 | 대응 |
|---|---|---|
| `user_prompt_harness_context.mjs` 교체 후 컨텍스트 미주입 | 낮음 | Phase A 완료 후 세션 재시작으로 트리거 검증 |
| `docs/.archive/` 내 `docs/feat_` 언급이 grep 결과 오탐 | 중간 | grep 제외 패턴에 `.archive` 경로 추가 |
| design-rule §5.1 변경과 §6 freeze 권장 충돌 | 낮음 | 경로 컨벤션은 §6 advisory 본문 변경 아님 |
| Phase B 파일 수 많아 일부 누락 | 중간 | 인수조건 #1 grep 으로 잔존 검증 |
