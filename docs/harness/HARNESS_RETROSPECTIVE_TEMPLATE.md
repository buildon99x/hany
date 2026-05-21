---
role: behavior
portability: portable
deprecated: trigger checklist moved to HANDOFF_TEMPLATE.md §10 — full retrospective body still uses sections defined here
---

> **PARTIALLY DEPRECATED** — Medium+ 피처 회고는 `HANDOFF_TEMPLATE.md` §10 트리거 체크리스트로 진입. 본 파일은 회고 본문 작성 시 섹션 정의 (§1–§8 + §6-B) 의 참조 원본으로 유지.

# Harness Retrospective Template

> 사용법: Harness Phase 전체 완료 후 `docs/spec/{feat-name}_harness_retrospective.md`로 복사·작성.
> 목적: 이번 피처에서 발생한 암묵지 누락·Phase Contract 공백·프로세스 개선점을 기록하여 다음 s1 작성 품질에 반영 (L4 피드백 루프).

---

## 피처 정보

- **feat-name**: `{feat-name}`
- **티어**: Low / Medium / High
- **완료일**: YYYY-MM-DD
- **Ledger 경로**: `docs/spec/{feat-name}_harness_ledger.md`

---

## 1. 즉흥 결정 목록

구현 중 s1/s2에 없어서 즉흥적으로 내린 결정을 기록한다.

| 결정 내용 | 결정 컨텍스트 | s1 어디에 있었어야 했는가 |
|---|---|---|
| (예: 파일 분리 대신 인라인 유지) | (예: Phase 2에서 함수가 작아 분리 불필요로 판단) | (예: §2 ATK — 인접 불변조건 항목에 "이 함수는 분리하지 않음" 명시 가능) |

---

## 2. 누락된 암묵지 항목

ATK 체크리스트로 포착했어야 했으나 놓친 항목.

| ATK 질문 | 누락된 내용 | 영향 |
|---|---|---|
| 인접 불변조건 | | |
| 이전 실패 | | |
| 비명시 제약 | | |
| MVP 경계 | | |

---

## 3. Phase Contract 공백

어느 Phase에서 인수조건이 불명확하여 완료 판정이 어려웠는가.

| Phase | 공백 내용 | 개선 방향 |
|---|---|---|
| | | |

---

## 4. 루프예산 사용량

Phase 별 자동 재시도 누적 횟수와 루프예산(기본 3회) 대비 소진율. Ledger Decision Log 의 루프 카운트 컬럼을 참조.

| Phase | 루프예산 한도 | 실제 재시도 누적 | 소진 사유(있으면) |
|---|---|---|---|
| Phase A | 3 | | |
| Phase B | 3 | | |
| Phase C | 3 | | |
| Phase D | 3 | | |
| Phase E | 3 | | |

루프예산 초과로 사용자 에스컬레이션이 발생한 경우 §8 프로세스 메모에도 기록.

---

## 5. 인수조건 충족도

Phase 별 인수조건이 1차 시도에 통과했는지, 보강이 필요했는지 정리. 보강 사유는 다음 s1 의 Phase Contract 작성 품질 개선에 직접 반영.

| Phase | 인수조건 항목 수 | 1차 통과 | 보강 필요 사항 |
|---|---|---|---|
| Phase A | | | |
| Phase B | | | |
| Phase C | | | |
| Phase D | | | |
| Phase E | | | |

---

## 6. Scope Discovery 충돌 요약

Scope Discovery Log에서 발생한 충돌 및 해소 패턴.

| 발견된 의존성 | Context Carry 일치 여부 | 처리 결과 | 재발 방지 |
|---|---|---|---|
| | | | |

---

## 6-B. Effort 분석

Effort Ledger 의 Phase 별 active turn time / 토큰 합계에서 임계 (시간 ≥ Σ의 30% OR ≥ 20분 · 토큰 ≥ Σ의 30% OR ≥ 50k) 를 초과해 `[T]` / `[K]` / `[TK]` 마킹된 Phase 만 기록한다. 단일 Phase ledger 는 마킹 면제 — 본 섹션 생략 가능.

요인 카테고리 (6종, 단일 선택 또는 복수 매칭): **탐색** · **재시도** · **리뷰응답** · **cross-cutting** · **외부 IO** · **컨텍스트 폭주**.

| Phase | 마킹 | 현황 (시간/토큰 수치) | 요인 카테고리 | 루프예산 발동 | 발동 태그 | follow-up |
|---|---|---|---|---|---|---|
| | | | | | | |

> "발동 태그" 컬럼: design-rule.md §6 Footnote 2 advisory 발동 태그 3종(`[s1-grep-trigger]` · `[verify-tag-trigger]` · `[privacy-surface-trigger]`) 중 해당 Phase 에서 기록된 항목 나열. 없으면 `—`.

---

## 7. 다음 s1 템플릿 개선 제안

이번 회고에서 도출된 s1/s2 템플릿 개선 사항.

- (제안 1)
- (제안 2)

---

## 8. 프로세스 메모

기타 Harness Workflow 자체에 대한 피드백.

- (메모)
