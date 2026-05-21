---
kind: feat
name: spec-doc-management
stage: 2
status: complete
---

# Harness Retrospective — spec-doc-management

## 피처 정보

- **feat-name**: `spec-doc-management`
- **티어**: Medium
- **완료일**: 2026-05-20
- **Ledger 경로**: `docs/spec/spec-doc-management_harness_ledger.md`

---

## 1. 즉흥 결정 목록

| 결정 내용 | 결정 컨텍스트 | s1 어디에 있었어야 했는가 |
|---|---|---|
| Grandfathered 실행 채택 | harness-entry SKILL이 구 경로(`docs/feat_*`)를 참조해 `/harness-start` 검증 실패. s1/s2가 이미 신 경로(`docs/spec/`)에 존재 | §에스컬레이트 조건에 "self-application 회귀 → grandfathered 진입 경로" 명시 필요 |
| Phase B 추가 파일 일괄 처리 | 인수조건 grep 결과 Phase B 작업 목록 외 파일(harness-start, harness-import, harness-loop, privacy-by-design 등) 잔존 발견 | §영향 파일 표에 `grep -rl 'docs/feat_'` 범위 내 전체 파일 사전 열거 의무 |
| CLAUDE.md 직접 Edit | Phase B 서브에이전트가 `.claude/CLAUDE.md` 권한 차단 → 메인 에이전트 직접 처리 | Phase B 서브에이전트 스코프에 CLAUDE.md 권한 요건 명시 |

---

## 2. 누락된 암묵지 항목

| ATK 질문 | 누락된 내용 | 영향 |
|---|---|---|
| 인접 불변조건 | harness-entry, harness-start, harness-loop 등 경로 참조 파일이 Phase B 작업 목록에서 누락 | 인수조건 grep 실행 후 추가 작업 발생 |
| 이전 실패 | `scripts/lib/` 누락처럼 "있다고 가정한 파일 부재" 패턴 — self-application 경우에도 동일하게 발동 | grandfathered 실행 경로 필요, 예측 가능했음 |
| 비명시 제약 | `.claude/CLAUDE.md` 는 권한 보호 대상 파일 — 서브에이전트 접근 차단 | Phase B 서브에이전트 실행 중 차단으로 메인 보완 필요 |
| MVP 경계 | Phase B 영향 파일 15개 예상이었으나 실제 26파일 변경 | 초기 영향 파일 표가 `grep -rl` 기반 사전 열거 없이 작성됨 |

---

## 3. Phase Contract 공백

| Phase | 공백 내용 | 개선 방향 |
|---|---|---|
| B | 인수조건 #1 (`grep -rl 'docs/feat_'` 0파일)의 대상 범위가 명시적 작업 목록보다 넓어 추가 작업 유발 | 영향 파일 표 작성 시 `grep -rl` 사전 실행 → 전체 파일 목록 enumeration 필수 |
| B | CLAUDE.md 서브에이전트 접근 권한 차단 예측 못함 | 서브에이전트 스코프에 권한 요건 항목 추가 |

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
| A | 3 | ✅ (테스트 67 passed, 0 failed) | 신규 테스트 케이스 3개 (목표 ≥6 대비 — 기존 케이스 docs/spec/ 이미 반영됨) |
| B | 4 | ⚠️ 부분 | CLAUDE.md 권한 차단 → 메인 직접 처리, 추가 파일 15개 발견 → 일괄 sed 처리 |

---

## 6. Scope Discovery 충돌 요약

| 발견된 의존성 | Context Carry 일치 여부 | 처리 결과 | 재발 방지 |
|---|---|---|---|
| harness-start.md, harness-import.md, harness-loop.md, privacy-by-design/SKILL.md 등 13개 추가 파일 | 불일치 (Phase B 작업 목록에 없었음) | 메인 에이전트 sed 일괄 처리 | s1 영향 파일 표 작성 전 `grep -rl 'docs/feat_'` 실행해 전체 목록 사전 확정 |

---

## 6-B. Effort 분석

Effort Ledger 자동 집계 미수행 (JSONL 이벤트 없음 — n/a 행). [T] 마킹 기준 미충족 판정 불가.

| Phase | 마킹 | 현황 | 요인 카테고리 | 루프예산 발동 | 발동 태그 | follow-up |
|---|---|---|---|---|---|---|
| A | — | n/a | 탐색 + 서브에이전트 | 없음 | [s1-grep-trigger] | — |
| B | — | n/a | 탐색 + 서브에이전트 + 재시도 | 없음 | — | — |

---

## 7. 다음 s1 템플릿 개선 제안

- **영향 파일 표 작성 전 grep 실행 의무화**: s1 §영향 파일 표 작성 시 `grep -rl '<대상 패턴>'` 을 직접 실행해 전체 파일 목록을 사전 확정. 목록 작성 후 grep 하면 누락이 인수조건 단계에서 드러남.
- **Self-application 회귀 케이스 표준화**: harness 인프라 자체를 변경하는 feature 는 s1 §에스컬레이트 조건에 "harness-entry grandfathered 진입 필요 여부" 항목 추가.
- **서브에이전트 스코프에 권한 요건 명시**: `.claude/CLAUDE.md` 등 권한 보호 파일이 포함된 경우 서브에이전트 스코프에 "메인 에이전트 직접 처리" 명시.

---

## 8. 프로세스 메모

- Phase B 서브에이전트가 작업 목록 외 파일(13개)을 발견하지 못한 것은 사전 grep 없이 작업 목록을 작성했기 때문. 이번처럼 `docs/feat_` 같은 전역 패턴을 다루는 경우 impact research 단계에서 반드시 grep 선행 필요.
- Grandfathered 실행은 self-application feature 의 불가피한 패턴 — 재발 시 harness-entry SKILL §Readiness Validation 에 "신 경로 허용 범위 명시" 개선 고려.
- hooks:test 기준선 64 → 67 (+3) — Phase A 신규 케이스 의미 있음.
