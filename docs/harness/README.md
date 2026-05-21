---
role: reference
portability: project-specific
---

# Harness Documentation Map

본 디렉터리는 Pixel Horizon feature quality, resident stability, privacy, Claude Code workflow control 시스템의 문서를 담는다. **운영 절차는 본 파일이 아닌 진입 문서로 위임** — README는 지도 역할에 집중.

> 역할 분류표: `docs/harness/_INDEX.md` (동작/참고/산출물).
> 적용·설치·훅 동작 세부: `docs/harness/CLAUDE_CODE_HARNESS_APPLY.md`.

## 진입 경로

| 상황 | 시작 문서 |
|---|---|
| 처음 시스템 이해 | `HARNESS_PLAN.md` (정책 의도) |
| 새 피처 작업 | `HARNESS_OPERATING_PLAYBOOK.md` (7단계 절차) |
| Medium+ 피처 구현 | `/harness-start {feat-name}` → `.claude/skills/harness-entry/SKILL.md` |
| GitHub 이슈 자율 처리 | `/harness-loop` → `.claude/commands/harness-loop.md` |
| Harness 자체 수정 | `/harness-maintain` → `HARNESS_SELF_MAINTENANCE.md` |
| 티어 분류 | `FEATURE_DIFFICULTY_TIERS.md` |
| Claude Code 셋업 | `CLAUDE_CODE_HARNESS_APPLY.md` |

## 핵심 문서 카탈로그

| 분류 | 문서 |
|---|---|
| 워크플로우 | `HARNESS_OPERATING_PLAYBOOK.md`, `HARNESS_SELF_MAINTENANCE.md`, `IMPLEMENTATION_SEQUENCE.md` |
| 진행 중 템플릿 | `PHASE_TEMPLATE.md`, `HARNESS_LEDGER_TEMPLATE.md`, `DATA_INVENTORY_TEMPLATE.md` |
| 핸드오프 템플릿 | `HANDOFF_TEMPLATE.md` |
| 분류·용어 | `FEATURE_DIFFICULTY_TIERS.md`, `GLOSSARY.md` |
| 리뷰·설계 | `FEATURE_REVIEW_CHECKLIST.md`, `UX_PRIVACY_DESIGN_GUIDE.md`, `ADDITIONAL_REVIEW_PERSPECTIVES.md` |
| 적용·아키텍처 | `CLAUDE_CODE_HARNESS_APPLY.md`, `HARNESS_ARCHITECTURE.md` |
| 운영 | `HARNESS_LOOP_DASHBOARD.md`, `HARNESS_LOOP_ISSUE_FILTERING.md` |
| 의사결정 기록 | `adr/`, `simulations/`, `PLAN_REVIEW_GEMINI.md` |
| Deprecated (호환용) | `QUALITY_GATE_MATRIX.md`, `WORK_STATUS_TEMPLATE.md`, `FEATURE_QUALITY_NOTE_TEMPLATE.md`, `HARNESS_RETROSPECTIVE_TEMPLATE.md` — 대체 매핑은 `_INDEX.md` |

## Decision Ledger (런타임 생성)

피처별 자동 생성: `docs/spec/{feat-name}_harness_ledger.md`. Phase Status / Decision Log / Escalation Log / Scope Discovery Log 포함. `/harness-start` 가 초기화·재개.
피처 목록 인덱스: `docs/spec/INDEX.md`

## Non-Negotiables

- 입력 데이터는 aggregate-only. Raw key values, typed strings, click coordinates, cursor paths, window titles, app-specific input content, user-content screenshots 모두 fixtures/logs/reports/dashboards/failure artifacts 에 저장 금지.
- Privacy scrubber 는 모든 티어에서 touched artifacts 차단 게이트.
- Background lifecycle 변경은 cleanup 증거 + 중복 timers/listeners/workers/subscriptions 부재 증거.
- 장시간 검증은 pause point + 다음 액션 명시.
- 영속 데이터·마이그레이션·업데이트·리커버리 변경은 explicit rollback 또는 degraded-mode story.

## 유지보수 메모

- `post_edit_quality_gate.mjs` 의 s1/s2 `.md` 분기는 `docs/spec/*_s[12].md` 패턴 전용. 동일 명명 패턴 신설 시 `scripts/test-hooks.mjs` 에 회귀 케이스 추가 (s2 §5 R5).
