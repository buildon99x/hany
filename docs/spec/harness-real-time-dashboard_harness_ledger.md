---
role: ledger
portability: portable
feat: harness-real-time-dashboard
status: active
---

# Decision Ledger — harness-real-time-dashboard

> 본 ledger 는 runtime artifact 다. Phase 커밋과 번들. 단독 커밋 금지.

## Tier · Branch · Scope

- **Tier**: Medium
- **Branch**: `claude/harness-realtime-dashboard-YhCMf`
- **선행 결정 항목 수**: 6 (s1 §5 Context Carry)
- **MVP 경계**: 표시 항목 §2 5행만 · 외부 의존성 0 · hook/agent/auto-spawn 0 · 외부 네트워크 0 · scroll/paging 없음.

## Phase Status

| # | Phase | 상태 | 커밋 | 비고 |
|---|---|---|---|---|
| 1 | A — 정상 기능 (단독 verifiable) | ✅ 완료 | (this commit) | scripts/harness-watch.mjs · scripts/lib/ledger-parser.mjs · package.json |
| 2 | B — 검증·통합 (Phase A 후) | 🔲 미시작 | — | docs/harness/README.md · tests/harness-watch/* |

상태 기호: 🔲 미시작 · 🟡 진행 · ⏸ 보류(에스컬레이션) · ✅ 완료 · ⚠️ 회귀.

## Decision Log

> Advisory 발동 태그 3종 (`[s1-grep-trigger]` · `[verify-tag-trigger]` · `[privacy-surface-trigger]`) 는 본 Decision Log 의 "결정" 또는 "이유" 컬럼에 인라인 기록 (design-rule.md §6 Footnote 2 — 측정 grep 대상).

| # | 날짜 | Phase | 결정 | 이유 | 커밋 |
|---|---|---|---|---|---|
| 1 | 2026-05-21 | seed | s1 §7 "OR 4중 임계" 인용 정정 (Footnote 5 → 단일 임계 ≥50K char) | s1 grandfathered, 본 s2 §0 메모로 대체 | 92bd3b2 |
| 2 | 2026-05-21 | seed | R1 — Decision Log advisory 태그 ISO8601 시각 부재 가능 | Phase A 진입 시 실제 ledger 1건 grep, 불가 시 "since start" 폴백 | 92bd3b2 |
| 3 | 2026-05-21 | seed | R2 — Windows `fs.watch` `rename` 이벤트 검증 환경 부재 | `change`/`rename` 둘 다 핸들러 (방어적), Win 머신 확보 시 추가 검증 | 92bd3b2 |
| 4 | 2026-05-21 | seed | R3 — `engines.node >=18.17` husky/lint-staged 호환 | Phase A 시작 시 `npm install --dry-run` 사전 확인 | 92bd3b2 |
| 5 | 2026-05-21 | seed | R4 — 다중 동시 실행 시 OS 한도 압박 | 영향 무시 (의도적 실행), 명시 안 함 | 92bd3b2 |
| 6 | 2026-05-21 | seed | R5 — TUI snapshot color 차이 flaky | snapshot 은 `--ascii` + `--once` 조합만 (결정적) | 92bd3b2 |
| 7 | 2026-05-21 | seed | 사전 grep 인용 (`[pre-grep-trigger]` 회피) | s1 §4 `harness:watch\|generate-harness-watch` 0건 | 3183a5f |
| 8 | 2026-05-21 | A | Phase A 인수조건 [verify:] 1-5 PASS · 6-7 runtime-deferred (비-TTY 환경) | grep counts == 1 / --once exit 0 / --help exit 0 / hooks:test 69/69 / 코드 검증 cleanup() | (this commit) |
| 9 | 2026-05-21 | A | Lifecycle cleanup: 단일 `cleanup()` 함수가 watcher/timers/raw-mode/cursor/stdin 일괄 정리, SIGINT/SIGTERM/SIGBREAK/SIGHUP/SIGPIPE/EPIPE 라우팅 | PostToolUse hook follow-up 응답 — 격리 원칙 + non-negotiable lifecycle | (this commit) |
| 10 | 2026-05-21 | A | Security boundary: 새 hook/upload/network 0, 읽기 전용 디스크 접근만, 출력 aggregate-only (sha7/카운트/상대시각) | PostToolUse hook follow-up 응답 — non-negotiable scrubber | (this commit) |

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

> Phase A: 인수조건 1차 통과 (재시도 0).

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
- 모든 Phase ✅ 완료 후 `docs/spec/harness-real-time-dashboard_harness_retrospective.md` 작성 → Effort 분석 섹션 포함 → 마지막 Phase 커밋과 번들 (Playbook Step 7).
