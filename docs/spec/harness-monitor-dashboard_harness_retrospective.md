---
kind: feat
name: harness-monitor-dashboard
stage: 2
status: complete
---

# Harness Retrospective — harness-monitor-dashboard

## 피처 정보

- **feat-name**: `harness-monitor-dashboard`
- **티어**: Medium
- **완료일**: 2026-05-21
- **Ledger 경로**: `docs/spec/harness-monitor-dashboard_harness_ledger.md`
- **목적**: 하네스 전체 흐름 검증 테스트 케이스 + 실용 대시보드 동시 달성

---

## 1. 즉흥 결정 목록

| 결정 내용 | 결정 컨텍스트 | s1 어디에 있었어야 했는가 |
|---|---|---|
| Phase B false positive 발견 → Scope Discovery 로 기록 전환 | advisory item 6·7 grep 이 파일 전체 스캔 방식이라 섹션 외 키워드 오탐 → 의도한 `[pre-grep-trigger]`·`[delegation-mode-trigger]` 미발동 | §5 Context Carry 에 "Phase B 시나리오 — false positive 가능성" 위험 항목 추가 필요 |
| Phase A 서브에이전트 1회 위임으로 스크립트·package.json·.gitignore 완성 | 영향 파일 3개이나 신규 로직 구현 포함 → subagent 적합 판단 | s2 Phase A 서브에이전트 스코프에 "단순 Add vs 로직 구현" 분류 기준 명시 가능 |

---

## 2. 누락된 암묵지 항목

| ATK 질문 | 누락된 내용 | 영향 |
|---|---|---|
| 인접 불변조건 | harness-entry SKILL item 6·7 advisory grep 이 파일 전체 스캔 방식임을 사전에 인지 못함 | Phase B 테스트 시나리오의 예상 결과(발동)와 실제 결과(미발동) 불일치 |
| 이전 실패 | — (이전 실패 해당 없음) | — |
| 비명시 제약 | advisory grep 은 `grep -n '<keyword>' <file>` 전체 스캔 — 섹션 범위 한정 없음 | false positive 로 테스트 시나리오가 의도한 대로 동작 안 함 |
| MVP 경계 | Phase B 목적이 "advisory 발동 확인"이었으나 grep 한계로 "grep 한계 발견"으로 목적 재정의 | Phase B 인수조건 AC1·AC2 (trigger 기록 확인) 미충족 → 인수조건 재정의 필요 |

---

## 3. Phase Contract 공백

| Phase | 공백 내용 | 개선 방향 |
|---|---|---|
| B | 인수조건 AC1·AC2 (`[pre-grep-trigger]`·`[delegation-mode-trigger]` 기록 확인) 가 실제 미충족 — grep 한계로 발동 안 됨. 발견된 사실(false positive)을 Decision Log 에 기록하고 인수조건을 재정의 | Phase B 설계 시 "advisory 게이트 발동 확인" 이전에 "그 게이트가 section-aware 인지" 사전 검증 항목 추가 |
| B | Phase B 인수조건이 "발동 확인" 에서 "false positive 확인 및 기록"으로 런타임 재정의 — s2 작성 시점에 grep 한계 예측 불가 | advisory 게이트 검증 테스트는 hooks:test 단위 테스트로 처리하는 것이 더 적합 |

---

## 4. 루프예산 사용량

| Phase | 루프예산 한도 | 실제 재시도 누적 | 소진 사유 |
|---|---|---|---|
| A | 3 | 0 | — |
| B | 3 | 0 | — |

---

## 5. 인수조건 충족도

| Phase | 인수조건 항목 수 | 1차 통과 | 보강 필요 사항 |
|---|---|---|---|
| A | 7 | ✅ (서브에이전트 1회 완료, hooks:test 67 passed) | — |
| B | 5 | ⚠️ 부분 | AC1·AC2 (trigger 기록) 미충족 → false positive 발견으로 Decision Log + Scope Discovery Log 기록으로 대체. AC3·AC4·AC5 통과 |

---

## 6. Scope Discovery 충돌 요약

| 발견된 의존성 | Context Carry 일치 여부 | 처리 결과 | 재발 방지 |
|---|---|---|---|
| harness-entry SKILL item 6·7 advisory grep 이 파일 전체 스캔 방식 — 섹션 외 키워드로 false positive 발생 | 불일치 (Phase B 예상: 발동, 실제: 미발동) | Decision Log #1 + Scope Discovery Log #1 기록. 개선 후보로 명시 | advisory 게이트 발동 테스트는 hooks:test 단위 테스트로 분리. Phase B 시나리오 설계 시 grep 방식 사전 확인 |

---

## 6-B. Effort 분석

| Phase | 마킹 | 현황 | 요인 카테고리 | 루프예산 발동 | 발동 태그 | follow-up |
|---|---|---|---|---|---|---|
| A | — | n/a (서브에이전트 93s / 21k tokens) | 탐색 + 구현 | 없음 | — | — |
| B | — | n/a (메인 직접, main-direct 패턴 dogfooding) | 탐색 + 텍스트 조작 | 없음 | — | — |

---

## 7. 다음 s1 템플릿 개선 제안

- **advisory 게이트 테스트 시나리오 설계 시 grep 방식 사전 확인 의무화**: Phase B 처럼 "advisory 발동 확인"을 시나리오로 쓸 경우, harness-entry SKILL 의 grep 이 파일 전체 스캔인지 section-aware 인지 먼저 확인. 전체 스캔이면 false positive 위험 → 인수조건에 "해당 섹션에만 키워드 없음 확인" 으로 좁혀서 작성.
- **harness-entry SKILL item 6·7 개선 후보 명시**: `grep -n '<keyword>' <file>` → `awk '/^## 4\./,/^## /' <s1-file> | grep '<keyword>'` 방식으로 §영향 파일 표 섹션 범위 내 스캔으로 개선하면 false positive 제거 가능. 단 awk 기반이라 패턴 복잡도 증가 — hooks:test 단위 케이스 신규 추가 필요.
- **Phase B 하네스 테스트 목적에 맞는 인수조건 설계**: "advisory 발동 확인" 대신 "발동 조건 충족 여부 grep 직접 검증" 으로 인수조건 작성 (발동 여부는 SKILL 내부 동작 — 블랙박스 테스트보다 화이트박스가 적합).

---

## 7-B. 개선 후보 평가 결과 (2026-05-21)

retrospective §7 의 3개 제안을 신중 분석 (필요성·기대효과·트레이드오프) 후 **현 시점 액션 없음** 으로 결정. 30일 freeze 권장 유지.

| 후보 | 결정 | 핵심 사유 |
|---|---|---|
| 1. harness-entry SKILL item 6·7 section-aware grep | **30일 후 재검토** | Footnote 4 placeholder 미발효 — 발동 카운트 누적 자체가 시작 안 됨. 정밀도 개선 측정 대상 부재. awk 기반 = Windows 호환성 우려. §6 Footnote 4 "30일 freeze 권장" 정면 위반. |
| 2. advisory 게이트 검증 hooks:test 분리 | **적용 안 함** | §6 Footnote 1 "자동화 헬퍼 0" 원칙 위반. advisory = LLM 권고 판단 — hooks 자동화로 옮기면 차단 게이트로 변질. |
| 3. 하네스 테스트 spec 시나리오 패턴 룰 본문화 | **적용 안 함** | 1회성 패턴 (반복 빈도 낮음). design-rule 비대화 + "룰 9일 5회 변경" anti-pattern 재발 위험. |

**재검토 트리거**: Footnote 4 발효일 +30일 시점 발동 카운트 ≥3 + false positive 비율 측정 가능 시 후보 1 재평가.

**진짜 성과**: 하네스가 첫 실행에서 advisory 게이트 false positive 를 자체 검출 — 룰 추가 없이 한계를 데이터로 기록함 (Scope Discovery Log #1 이 증거).

---

## 8. 프로세스 메모

- Phase A 서브에이전트 (mode: subagent) 가 스크립트·package.json·.gitignore 를 1회 위임으로 완성 — subagent delegation 효율 양호 (21k tokens, 93s, 9 tool calls).
- Phase B 는 harness-improve-v1 에서 추가한 G2 dogfooding (`mode: main-direct`) 을 실제로 적용한 첫 케이스. 단순 텍스트 편집은 main-direct 가 훨씬 가벼움 확인.
- 하네스 테스트 목적 달성 여부: "전체 흐름 검증" ✅, "advisory 게이트 발동 확인" ⚠️ (false positive 발견으로 게이트 한계 식별 — 더 유용한 발견).
- 대시보드 정상 동작: `npm run harness:dashboard` → 3개 feature 렌더링, 이모지 멀티바이트 파싱 정상, 빈 상태·n/a 처리 정상.
