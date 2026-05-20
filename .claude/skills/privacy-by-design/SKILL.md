---
name: privacy-by-design
description: Enforce Pixel Horizon privacy rules for keyboard, mouse, logs, reports, fixtures, storage, and failure artifacts. Use when touching input events, telemetry, data inventory, logs, screenshots, reports, exports, or permissions.
---

# Privacy By Design

Pixel Horizon must protect personal privacy by default.

## Never Store
- Raw key values.
- Typed strings.
- Exact click coordinates.
- Cursor paths.
- Window titles.
- App-specific input content.
- Screenshots containing user content.

## Allowed Input Data
Only aggregate activity signals are allowed:
- Counts.
- Rates.
- Durations.
- Coarse buckets.
- Dropped-event ratios.
- Aggregate latency.

## Required Checks
1. Use `docs/harness/DATA_INVENTORY_TEMPLATE.md` for any collected, stored, displayed, exported, logged, uploaded, or retained data.
2. Require privacy scrubber evidence for touched fixtures, logs, reports, dashboards, and artifacts.
3. Confirm retention and deletion paths.
4. Treat highly granular timelines as privacy-sensitive and require separate review.

## 외부 출력 표면 9종 체크리스트 (advisory — design-rule.md §6 Footnote 2)

새로운 정보 생성·수정 시 다음 9개 출력 표면별로 privacy scrub 의무를 확인한다. 누락 시 ledger Decision Log에 `[privacy-surface-trigger]` 태그 기록.

| # | 출력 표면 | 검증 채널 |
|---|---|---|
| 1 | 로그 파일 (stdout / file / structured log) | sanitize.mjs + 수동 |
| 2 | 화면 표시 (UI / HUD / 토스트 / 모달) | UX review + ux-review skill |
| 3 | 보고서·대시보드 (HTML/PNG/PDF 산출) | privacy scrubber + 수동 |
| 4 | 익스포트 파일 (CSV/JSON/PHB) | privacy scrubber + 수동 |
| 5 | 텔레메트리·메트릭 (집계 카운터·gauge·히스토그램) | aggregate-only invariant + 수동 |
| 6 | GitHub Issue / PR 본문 (Producer/Reporter) | sanitize.mjs (fallback issue body 포함) |
| 7 | GitHub Comment / Review (PR 코멘트·리뷰 본문) | sanitize.mjs + pr-review-fix |
| 8 | Retrospective / Lesson 문서 (`docs/learn/` · `docs/spec/*_retrospective.md`) | learn-record skill + 수동 |
| 9 | Simulate-User report (`docs/sim_*.md`) | simulate-user skill 본문 가이드 |

Cross-ref: `pr-review-fix`, `learn-record`, `simulate-user` 스킬은 본 9종 체크리스트를 단일 출처로 참조한다.

## Review Copy
Privacy copy must clearly say what is collected and, when useful, what is not collected. Do not use fear-based permission copy.
