---
role: runtime-artifact
portability: project-specific
---

# Decision Ledger — harness-monitor-dashboard

## Tier · Branch · Scope

- **Tier**: Medium
- **Branch**: `claude/harness-monitor-dashboard-v1`
- **선행 결정 항목 수**: 5 (서버리스 · 내장 모듈 · gitignore · advisory 카운트 · Phase B 테스트)
- **MVP 경계**: 정적 HTML 대시보드 스크립트 + Phase B advisory 게이트 발동 테스트. 코드 기능 변경 없음.

## Phase Status

| # | Phase | 상태 | 커밋 | 비고 |
|---|---|---|---|---|
| 1 | A — 스크립트 구현 + package.json + .gitignore | ✅ 완료 | 3911b65 | |
| 2 | B — advisory 게이트 의도적 누락→발동→복구 | ✅ 완료 | 2a8ba6e | |

상태 기호: 🔲 미시작 · 🟡 진행 · ⏸ 보류(에스컬레이션) · ✅ 완료 · ⚠️ 회귀.

## Decision Log

| # | 날짜 | Phase | 결정 | 이유 | 커밋 |
|---|---|---|---|---|---|
| 1 | 2026-05-21 | B | advisory item 6·7 false positive 확인 — `[pre-grep-trigger]`·`[delegation-mode-trigger]` 미발동 | harness-entry SKILL grep 이 파일 전체 스캔 방식 → 섹션 외 동일 키워드 등장 시 오탐. section-aware grep 필요 (개선 후보). | — |

## Escalation Log

| # | 날짜 | Phase | 카테고리 | 사유 | 사용자 답변 | 해결 상태 |
|---|---|---|---|---|---|---|

## Scope Discovery Log

| # | 날짜 | Phase | 발견 항목 | Context Carry 일치 | 처리 결과 |
|---|---|---|---|---|---|
| 1 | 2026-05-21 | B | harness-entry advisory item 6·7 grep 이 파일 전체 스캔 방식 — 섹션 외 키워드 등장 시 false positive 발생, trigger 미발동 | 불일치 (s2 Phase B 시나리오 예상은 발동, 실제는 미발동) | 개선 후보로 기록. item 6·7 grep 을 §영향 파일 표 / §서브에이전트 스코프 섹션 범위로 좁혀야 함. Phase B 복구 후 retrospective §7 개선 제안에 반영. |

## Loop Budget Tracker

| Phase | 자동 수정 시도 | 동일 입력 재실행 | 정지 발동 |
|---|---|---|---|
| A | 0/3 | 0/2 | — |
| B | 0/3 | 0/2 | — |

## Subagent Invocations

| Date | Phase | Agent ID | task | duration_ms | total_tokens | tool_uses | status |
|---|---|---|---|---|---|---|---|
| 2026-05-21 | A | acb9c5bee8d530314 | generate-harness-dashboard.mjs + package.json + .gitignore | 93399 | 21219 | 9 | DONE |

## Effort Ledger

<!-- effort:auto:begin -->
| Phase | Active turn (min) | Wall (min) | In(k) | Out(k) | CC1h(k) | CC5m(k) | CR(k) | Mark |
|---|---|---|---|---|---|---|---|---|
<!-- effort:auto:end -->
