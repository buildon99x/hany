---
description: Harness Execution Zone 진입 — s1+s2 검증 후 Decision Ledger 초기화/재개 및 Phase 오케스트레이션 시작
---

# /harness-start — Harness 실행 진입

사용 형식: `/harness-start {feat-name}`

`$ARGUMENTS` 가 feat-name이다.

## 경로 규약

- Decision Ledger: `docs/feat_{feat-name}_harness_ledger.md` (런타임 산출물, Phase 커밋에 번들).
- Retrospective: `docs/feat_{feat-name}_harness_retrospective.md` (모든 Phase ✅ 완료 후 작성, 마지막 Phase 커밋에 번들).

## 처리 절차

1. `$ARGUMENTS`를 feat-name으로 파싱한다.
2. Readiness Validation 수행 (`.claude/skills/harness-entry/SKILL.md` §Readiness Validation 참조):
   - `docs/feat_{feat-name}_s1.md` 존재 + Context Carry 섹션 + **결정 항목 ≥2** (s1 Q6)
   - `docs/feat_{feat-name}_s2.md` 존재 + 모든 Phase에 6개 필드 완비
   - Medium+ 피처: s1에 ATK 의무 답변 존재 (Medium = 인접 불변·이전 실패 의무 2 + 권장 2; High = 4 전체 의무)
3. Validation 실패 시: 누락 항목을 명시하고 중단. Phase 실행 불가.
4. Validation 통과 시: Decision Ledger 초기화 또는 재개 (SKILL.md §Ledger Initialize / Resume 참조).
5. Orchestration Loop 시작 (SKILL.md §Orchestration Loop 참조).
6. 모든 Phase ✅ 완료 후: Retrospective 작성 안내 (Playbook Step 7).

## 예시

- `/harness-start improve-harness-workflow`
- `/harness-start fever-time`
- `/harness-start ms-store-release-preparation`
