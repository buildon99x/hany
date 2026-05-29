---
role: retrospective
portability: portable
feat: harness-real-time-dashboard
---

# Harness Retrospective — harness-real-time-dashboard

## 피처 정보

- **feat-name**: `harness-real-time-dashboard`
- **티어**: Medium
- **완료일**: 2026-05-21
- **Ledger 경로**: `docs/spec/harness-real-time-dashboard_harness_ledger.md`

---

## 1. 즉흥 결정 목록

| 결정 내용 | 결정 컨텍스트 | s1 어디에 있었어야 했는가 |
|---|---|---|
| `HARNESS_WATCH_SPEC_DIR` 환경변수 override 추가 | Phase B 테스트가 임시 spec 디렉터리에서 실행해야 했으나 `__dirname` 기반 절대 경로로 고정되어 있었음 | s1 §3 데이터 흐름 또는 §6 ATK 비명시 제약에 "테스트를 위한 SPEC_DIR 주입 방식" 명시 |
| 파서 trigger 태그 스캔을 "이유" → "결정+이유" 양쪽으로 확장 | 실제 ledger 가 `[pre-grep-trigger]` 를 결정 컬럼에 기록 → 카운트 0 으로 표시 (false negative) | s1 §3 데이터 흐름 "Decision Log 파싱 — 결정·이유 양쪽 컬럼 trigger 스캔" 명시 |
| README "inventory" 표 부재 → 진입 경로 표에 1줄 추가 | s1 §4 가 "inventory" 가정, 실제 README 는 문서 카탈로그 | s2 §4 가 "Phase B 진입 시 Read 로 확정" 위임했으므로 큰 누락 아님 |
| 테스트 인프라 = vitest → Plain Node 스크립트 (사용자 옵션 1) | vitest 미설치/미구성, MVP 정신 위반 소지 | s1 §6 ATK 비명시 제약에 "테스트 프레임워크 = 기존 `npm run hooks:test` 패턴 정합" 명시 |

---

## 2. 누락된 암묵지 항목

| ATK 질문 | 누락된 내용 | 영향 |
|---|---|---|
| 인접 불변조건 | 신규 lib 가 테스트 가능하려면 환경변수 override 필요 (다른 scripts/lib/*.mjs 는 모두 stateless 함수 export 라 환경 의존성 0) | Phase B 진입 후 즉흥 추가 (decision #11) |
| 이전 실패 | Decision Log advisory 태그 위치 (결정 vs 이유 컬럼) 불일치 — 템플릿이 양쪽 허용한다는 사실 | Phase B 에서 Logic error 발견 후 수정 (decision #12) |
| 비명시 제약 | 본 repo 는 .mjs 만, tsconfig.json 부재 → `[verify: tsc]` 자명 통과 | 경미 — Scope Discovery #3 으로 처리 |
| MVP 경계 | 테스트 프레임워크 선택은 MVP 경계의 일부 (vitest 도입 비용 vs Plain Node) | Phase B 진입 후 사용자 에스컬레이션 (Escalation #1) |

---

## 3. Phase Contract 공백

| Phase | 공백 내용 | 개선 방향 |
|---|---|---|
| Phase A | `[verify: 복합]` "Ctrl+C 후 `stty -a` echo 복구" 가 비-TTY 환경에서 직접 측정 불가 | "런타임 환경에 따른 verify 패턴" 가이드 추가 — 코드 검증 (가드 구문 존재) 으로 갈음 가능 명시 |
| Phase B | `[verify: vitest]` 가 인프라 부재 시 어떻게 대응할지 명시 안 됨 | Phase Contract 인수조건에 "인프라 부재 시 동등 검증 수단 합의" 단계 추가 |

---

## 4. 루프예산 사용량

| Phase | 루프예산 한도 | 실제 재시도 누적 | 소진 사유 |
|---|---|---|---|
| Phase A | 3 | 0 | — (1차 통과) |
| Phase B | 3 | 1 (테스트 환경변수 추가 후 재실행) | 비-TTY 환경에서 SPEC_DIR override 필요 발견 → 즉시 수정 후 재실행 |

루프예산 초과 0건. 사용자 에스컬레이션 1건 (테스트 인프라 선택) — 루프예산과 무관.

---

## 5. 인수조건 충족도

| Phase | 인수조건 항목 수 | 1차 통과 | 보강 필요 사항 |
|---|---|---|---|
| Phase A | 7 ([verify:] 5 + manual 2) | 5/7 즉시 통과, 2 (manual interactive · 복합 raw mode) 는 비-TTY 환경에서 코드 검증으로 갈음 | s2 시점에서 환경 조건부 verify 명시 |
| Phase B | 6 ([verify:] 6) | 5/6 즉시 통과, 1 (tsc) 자명 통과 (tsconfig 부재) | s1 ATK 비명시 제약에 "본 repo 는 .mjs only" 명시 |

---

## 6. Scope Discovery 충돌 요약

| 발견된 의존성 | Context Carry 일치 여부 | 처리 결과 | 재발 방지 |
|---|---|---|---|
| README 에 "inventory 표" 부재 (문서 카탈로그만) | Match — s2 §4 가 "Phase B 시작 시 Read 로 확정" 위임 | 진입 경로 표에 1줄 추가 (자율) | s1 작성 시 대상 파일 1회 grep + 표 형식 확인 |
| vitest 미설치/미구성 + tests/ 부재 | **No match** | 사용자 에스컬레이션 → 옵션 1 (Plain Node) | s1 ATK 비명시 제약에 기존 테스트 패턴 명시 |
| tsconfig.json 부재 | Match — s1 §6 MVP 경계 ".mjs only" 와 정합 | 회귀 대상 없음 → 통과 처리 | — |

---

## 6-B. Effort 분석

단일 세션, 2 Phase, 비교적 짧은 작업 → Effort Ledger 마킹 면제 (단일 phase 아니지만 분모 Σ 가 작아 임계 도달 불명확). 본 섹션 생략 처리.

자동 갱신은 PreToolUse hook 가 Phase 커밋 시 sentinel 영역에 행 추가 (자동). 본 회고 작성 시점에서는 합산 대기.

---

## 7. 다음 s1 템플릿 개선 제안

[ ] follow-up: ATK 비명시 제약에 "본 repo 테스트 프레임워크 패턴" 항목 추가 — Plain Node `scripts/test-*.mjs` vs vitest 결정 사전 박기.

[ ] follow-up: s1 §3 데이터 흐름 표준 항목에 "환경변수 override 필요성" 체크 추가 — 테스트가 가능한 격리 설계인지 사전 확인.

[ ] follow-up: s1 §4 영향 파일 표 작성 시 대상 파일 구조 1회 grep/Read 후 "정확한 줄/표/섹션 식별 확인" 컬럼 추가.

[ ] follow-up: design-rule.md §6 Footnote 2 advisory 태그 인라인 기록 위치 (결정 vs 이유) 일관성 권고 — 둘 다 허용하되 어디에 둘지 가이드 제시.

[ ] follow-up: s2 Phase Contract `[verify:]` 인수조건이 비-TTY/CI 환경에서 측정 불가능한 경우, "동등 대체 검증 수단" 사전 합의 단계 도입.

---

## 8. 프로세스 메모

- 격리 원칙 (hook/SessionStart/agent/auto-spawn 0) 은 본 피처의 핵심 보호막 — PR 리뷰에서 어떤 통합 제안도 거부할 근거 명문화 (s2 §6, §12). Review Response Protocol 의 Architecture 카테고리에 "격리 원칙 위반" 명시 효과 확인.
- Footnote 5 (subagent-dispatch-tuning) 시점에 본 피처가 동시 진행 → s2 §0 호환 메모 + G3 3 신규 필드 양식 dogfooding 으로 처리. s1 grandfathered 정책의 실효성 1차 확인.
- 사용자 에스컬레이션 (Escalation #1) → AskUserQuestion 1회 호출로 즉시 해결 (옵션 1 Plain Node 선택). 에스컬레이션 응답 시간이 짧을수록 후속 진행 비용 감소.
- TUI 출력 검증은 비-TTY/CI 환경 친화적 설계 (`--once` + NO_COLOR) 가 핵심. 인터랙티브 검증은 코드 가드 (cleanup() 함수 존재 + isTTY 분기) 로 갈음.
