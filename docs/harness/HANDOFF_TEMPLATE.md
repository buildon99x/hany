---
role: behavior
portability: portable
supersedes:
  - FEATURE_QUALITY_NOTE_TEMPLATE.md
  - HARNESS_RETROSPECTIVE_TEMPLATE.md
---

# Handoff Template — PR/완료 시점

피처 완료·PR 작성 시 본 템플릿을 채워 PR description 또는 task summary 로 사용. Medium+ 티어는 §10 회고 트리거에서 별도 retrospective 파일을 작성.

> 진행 중 상태(Gate Matrix · Work Status)는 `PHASE_TEMPLATE.md` 사용.

---

## 1. Feature
- Name:
- Related request:
- Related ADR:
- Quality gate matrix (Phase doc):
- Data inventory:
- Difficulty tier:
- Tier rationale:
- Tier changes during implementation:

## 2. Requirement Evidence
| Acceptance case | Evidence | Result |
| --- | --- | --- |
|  |  |  |

## 3. UI/UX Evidence
- Reviewed checklist:
- States covered:
- User-facing copy changes:
- Accessibility notes:
- Remaining UX risk:

## 4. Resident Stability Evidence
- Lifecycle cleanup checked:
- Background/resume checked:
- Sleep/wake checked:
- Soak or sampler evidence:
- Remaining stability risk:

## 5. Recovery and Data Integrity Evidence
- Degraded mode:
- Retry or pause path:
- Restart/interrupted-write evidence:
- Migration or rollback evidence:
- Double-counting prevention:

## 6. Privacy Evidence
- Data collected:
- Aggregation level:
- Raw input fields present: No
- Privacy scrubber result:
- Retention/deletion documented:

## 7. Security and Environment Evidence
- Secret/path/token scrub result:
- External dependency or hook trust review:
- Offline/online, battery, display, timezone, or locale evidence:
- Accessibility or time-semantics notes:

## 8. Operations
- Failure artifacts:
- Rollback or mitigation:
- Pause point:
- Follow-up:
- Deferred evidence expiry:

## 9. Stop Conditions Hit
구현 중 트리거된 stop-condition + 해소. 예: tier 중간 승격, loop budget 소진, privacy exception, 영속 스키마 마이그레이션 발견, soak 장기 실행.

- Trigger:
- Decision:
- Owner of follow-up:

---

## 10. Retrospective Trigger (Medium+ 의무)

Medium 이상 티어는 본 핸드오프와 별도로 `docs/spec/{feat-name}_harness_retrospective.md` 작성. 본 §10 은 회고 트리거 체크리스트 — 작성 완료 후 본 표를 채워 PR 에 첨부.

| 회고 섹션 | 작성 완료 | 핵심 발견 (1줄) |
|---|---|---|
| 1. 즉흥 결정 목록 | ☐ | |
| 2. 누락된 암묵지 항목 | ☐ | |
| 3. Phase Contract 공백 | ☐ | |
| 4. 루프예산 사용량 | ☐ | |
| 5. 인수조건 충족도 | ☐ | |
| 6. Scope Discovery 충돌 | ☐ | |
| 6-B. Effort 분석 | ☐ | |
| 7. 다음 s1 템플릿 개선 제안 | ☐ | |
| 8. 프로세스 메모 | ☐ | |

회고 본문 양식은 `HARNESS_RETROSPECTIVE_TEMPLATE.md` 의 섹션 구조를 그대로 사용 (해당 파일이 deprecated 라도 섹션 정의는 유효 — 다음 정리 단계에서 본 핸드오프 §10 하위로 인라인 예정).
