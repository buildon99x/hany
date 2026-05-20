---
role: runtime-artifact
portability: project-specific
---

# Decision Ledger — spec-doc-management

> Grandfathered 실행: harness-entry SKILL 이 구 경로(`docs/feat_*`)를 참조하나, 본 feature 의 s1/s2 는 신 경로(`docs/spec/`)에 존재. Phase B 완료 후 SKILL 경로 정규화 예정.

## Tier · Branch · Scope

- **Tier**: Medium
- **Branch**: `claude/harness-maintain-voXcw`
- **선행 결정 항목 수**: 4 (파일명 prefix A2 · Ledger 위치 B1 · portability 제외 · APPLY.md 제외)
- **MVP 경계**: hook 3개 경로 패턴 변경 + 문서 4중 동기 + git mv. 코드·기능 변경 없음.

## Phase Status

| # | Phase | 상태 | 커밋 | 비고 |
|---|---|---|---|---|
| 1 | A — Hook 경로 패턴 변경 | ✅ 완료 | 970ccc3 | |
| 2 | B — 문서 4중 동기 + 마이그레이션 | ✅ 완료 | 5c7ca2c | Retrospective 번들 예정 |

상태 기호: 🔲 미시작 · 🟡 진행 · ⏸ 보류(에스컬레이션) · ✅ 완료 · ⚠️ 회귀.

## Decision Log

| # | 날짜 | Phase | 결정 | 이유 | 커밋 |
|---|---|---|---|---|---|
| 1 | 2026-05-20 | — | Grandfathered 실행 채택 | Phase B 완료 전 신 경로로 harness-entry 우회. [s1-grep-trigger] s1 영향 파일 표 file:line 인용 컬럼 미충족 (advisory, 차단 아님) | — |

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

| Date | Phase | Agent ID | task | duration_ms | total_tokens | tool_uses | status |
|---|---|---|---|---|---|---|---|
| 2026-05-20 | A | a450e5282f012c01a | update hook path patterns docs/feat_* → docs/spec/* + test cases | 218525 | 37123 | 50 | DONE |
| 2026-05-20 | B | aab85df93fe5bb5ea | 4중 동기 docs/harness + design-rule + commands + skills path update | 207525 | 62499 | 54 | DONE |

## Effort Ledger

<!-- effort:auto:begin -->
| Phase | Active turn (min) | Wall (min) | In(k) | Out(k) | CC1h(k) | CC5m(k) | CR(k) | Mark |
|---|---|---|---|---|---|---|---|---|
<!-- effort:auto:end -->
