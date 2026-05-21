---
description: Harness 자기 수정 모드 진입 — HARNESS_SELF_MAINTENANCE.md 지침을 세션 컨텍스트로 주입
---

# /harness-maintain — Harness Self-Maintenance Mode

사용 형식: `/harness-maintain [category]`

`$ARGUMENTS` 는 선택 카테고리 식별자(A~F) 또는 자유 텍스트로 어떤 영역을 손볼지 명시. 비워두면 전체 가이드 적용.

## 처리 절차

1. `docs/harness/HARNESS_SELF_MAINTENANCE.md` 를 `Read` 로 로드한다.
2. 본 세션이 **harness 자기 수정 모드**임을 사용자에게 한 줄로 알린다 — 영향 범위 (모든 후속 세션 / 워크플로우 전체) + Non-Negotiables 7종 요지.
3. `$ARGUMENTS` 에 카테고리 식별자(A~F)가 있으면 해당 카테고리 체크리스트만 우선 표시. 자유 텍스트면 영향받을 카테고리를 추정해 제시.
4. 작업 진행 중 다음을 자동 환기:
   - hook 편집 시 `pnpm run hooks:test` 실행 의무.
   - design-stage SKILL 편집 시 §6 advisory 절차.
   - Apply Guide / Playbook / README / Glossary 동기화 의무.
5. 작업 종료 시 핸드오프 4종 (변경 카테고리·테스트 결과·자기 적용 회귀·동기 업데이트 문서) 를 commit 본문에 포함하도록 안내.

## 적용 범위

다음 경로 편집 시 본 가이드 자동 활성 (`post_edit_quality_gate.mjs` hook 이 동일 패턴 사용):

- `.claude/hooks/**`
- `.claude/settings.json`
- `.claude-context/**`
- `.claude/skills/**`
- `.claude/commands/**`
- `docs/harness/**`

## 예시

- `/harness-maintain` — 전체 가이드 적용.
- `/harness-maintain A` — Hook 편집(A 카테고리) 체크리스트 우선.
- `/harness-maintain settings.json deny 추가` — B 카테고리 추정.

## 일반 feature 작업과의 차이

| 측면 | 일반 feature | harness 자기 수정 |
|---|---|---|
| 진입 | `/stage-start` → `/harness-start` | `/harness-maintain` |
| 절차 본문 | `design-stage SKILL` + Playbook | `HARNESS_SELF_MAINTENANCE.md` |
| 의무 산출물 | s1/s2 + Ledger + Retro | 면제 가능 (commit 본문에 핸드오프 4종) |
| Loop budget | 동일 실패 auto-fix 3회 | 동일 + 룰 9일 5회 변경 안티패턴 |

$ARGUMENTS
