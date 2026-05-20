---
role: behavior
portability: portable
---

# Decision Ledger Template

> 사용법: `/harness-start {feat-name}` 진입 시 본 템플릿을 `docs/feat_{feat-name}_harness_ledger.md` 로 복사·초기화.
> 본 템플릿은 신규 ledger 에만 적용. 기존 ledger 는 비파괴 (수동 마이그레이션 시에만 sentinel 영역 삽입).
> 갱신은 항상 해당 Phase 커밋과 번들. 단독 커밋 금지.

## Tier · Branch · Scope

- **Tier**: Low / Medium / High
- **Branch**: `claude/{feat-name}-{suffix}`
- **선행 결정 항목 수**: (s1 §Context Carry 결정 개수)
- **MVP 경계**: (s1 §0 MVP 경계 한 줄 요약)

## Phase Status

| # | Phase | 상태 | 커밋 | 비고 |
|---|---|---|---|---|
| 1 | A — (제목) | 🔲 미시작 | — | |
| 2 | B — (제목) | 🔲 미시작 | — | |

상태 기호: 🔲 미시작 · 🟡 진행 · ⏸ 보류(에스컬레이션) · ✅ 완료 · ⚠️ 회귀.

## Decision Log

> Advisory 발동 태그 3종 (`[s1-grep-trigger]` · `[verify-tag-trigger]` · `[privacy-surface-trigger]`) 는 본 Decision Log 의 "결정" 또는 "이유" 컬럼에 인라인 기록 (design-rule.md §6 Footnote 2 — 측정 grep 대상).

| # | 날짜 | Phase | 결정 | 이유 | 커밋 |
|---|---|---|---|---|---|

## Escalation Log

| # | 날짜 | Phase | 카테고리 | 사유 | 사용자 답변 | 해결 상태 |
|---|---|---|---|---|---|---|

## Scope Discovery Log

| # | 날짜 | Phase | 발견 항목 | Context Carry 일치 | 처리 결과 |
|---|---|---|---|---|---|

## Loop Budget Tracker

| Phase | 자동 수정 시도 | 동일 입력 재실행 | 정지 발동 |
|---|---|---|---|
| A | 0/3 | 0/2 | — |
| B | 0/3 | 0/2 | — |

## Subagent Invocations

> design-rule.md §5.4 E1 (advisory §6 Footnote 3) — general-purpose 위임 완료 직후 1행 기입. Phase 종료/`/stage-end` 일괄 금지. 미수신값 = `unknown` 문자열 (skip/추정 금지). `task` 컬럼 Privacy scrub 룰 (design-rule §5.4) 준수. `status` = `DONE` / `PARTIAL` / `fallback-to-main` 중 하나.

| Date | Phase | Agent ID | task | duration_ms | total_tokens | tool_uses | status |
|---|---|---|---|---|---|---|---|

## Effort Ledger

> Phase 단위 active turn time + 5분할 토큰 수치. 자동 갱신 영역은 sentinel 마커 사이로 한정 — 영역 밖 텍스트는 보존.
> 마킹 (`[T]` / `[K]` / `[TK]`) 은 모든 Phase 완료 후 retrospective 작성 시점에 일괄 갱신 (분모 Σ 확정 후).
> 마킹 규칙: `[T]` = active turn ≥ Σ의 30% OR ≥ 20분 · `[K]` = (In+Out) ≥ Σ의 30% OR ≥ 50k · `[TK]` = 둘 다.
> 단일 Phase ledger 는 마킹 면제 (100% 노이즈 회피).
> 자동화: `npm run harness:effort -- --ledger <path> --phase {A|B|…} --branch {branch}` 또는 Phase 커밋 시 PreToolUse hook.

<!-- effort:auto:begin -->
| Phase | Active turn (min) | Wall (min) | In(k) | Out(k) | CC1h(k) | CC5m(k) | CR(k) | Mark |
|---|---|---|---|---|---|---|---|---|
<!-- effort:auto:end -->

## Bundle 규약

- Phase 커밋 메시지 본문 마지막 줄에 `Ledger: Phase {N} ✅ 완료, decision #{x}, escalation #{y}, scope #{z}` 1줄 요약.
- Ledger 갱신만 있는 단독 커밋 금지. 항상 Phase 산출물과 동일 커밋.
- Effort Ledger 자동 갱신도 Phase 커밋에 번들 — ledger 만 amend 금지.
- 모든 Phase ✅ 완료 후 `docs/feat_{feat-name}_harness_retrospective.md` 작성 → Effort 분석 섹션 포함 → 마지막 Phase 커밋과 번들 (Playbook Step 7).
