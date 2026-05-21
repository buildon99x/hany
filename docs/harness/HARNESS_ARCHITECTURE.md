---
role: reference
portability: project-specific
---

# Harness Architecture

Pixel Horizon 품질 하네스 한눈에 보기. 상세 규칙은 각 문서 참조.

> 진입: `README.md` → `HARNESS_OPERATING_PLAYBOOK.md`. 용어: `GLOSSARY.md`.

## 1. 구성요소

세 층으로 구성된다 — **문서(정책)**, **스킬(자동 주입)**, **훅(자동 검증)**. 런타임 산출물은 피처별 Ledger/Retrospective.

### A. 문서 (`docs/harness/`)
| 파일 | 역할 |
|---|---|
| `README.md` | 문서 맵 / 진입점 |
| `HARNESS_PLAN.md` | 북극성 품질 정책 (SLO·게이트·로드맵) |
| `HARNESS_OPERATING_PLAYBOOK.md` | Classify → Scope → Design → Implement → Verify → Handoff 워크플로 |
| `IMPLEMENTATION_SEQUENCE.md` | Phase 0–5 롤아웃 순서 |
| `FEATURE_DIFFICULTY_TIERS.md` | Low/Medium/High 분류 기준 |
| `QUALITY_GATE_MATRIX.md` | 요구사항↔게이트↔증거↔리스크 추적표 |
| `DATA_INVENTORY_TEMPLATE.md` | 수집·저장·삭제 데이터 인벤토리 |
| `FEATURE_QUALITY_NOTE_TEMPLATE.md` | PR/태스크 핸드오프 양식 |
| `WORK_STATUS_TEMPLATE.md` | 장시간 작업 상태 스냅샷 |
| `HARNESS_RETROSPECTIVE_TEMPLATE.md` | Medium+ 피처 사후 회고 |
| `UX_PRIVACY_DESIGN_GUIDE.md` / `FEATURE_REVIEW_CHECKLIST.md` | UX·프라이버시 설계·리뷰 기준 |
| `ADDITIONAL_REVIEW_PERSPECTIVES.md` | 복구·무결성·보안·환경 편차 추가 시각 |
| `GLOSSARY.md` | 공통 용어 + 축(axis) 정리 |
| `adr/` | 구조적 결정 기록 |
| `simulations/` | 가상 피처 드라이런 결과 |

### B. 스킬 (`.claude/skills/*/SKILL.md`) — 키워드 매칭으로 자동 주입
| 스킬 | 트리거 |
|---|---|
| `harness-entry` | `/harness-start {feat}` 진입, Readiness·Ledger·Phase 오케스트레이션 |
| `feature-quality-gate` | 신규 기능 요청 → acceptance/UI/안정성/프라이버시로 분해 |
| `privacy-by-design` | 입력·로그·리포트·저장 변경 → aggregate-only 강제 |
| `desktop-resident-stability` | 타이머/listener/worker/cache/subscription 변경 |
| `ux-review` | 사용자 향 화면·문구·접근성 검토 |
| `test-harness-author` | fixture/oracle/reporter/scrubber 추가·변경 |
| `harness-workflow-control` | 다단계 작업 상태/ADR/loop budget/pause point |

### C. 훅 (`.claude/hooks/*.mjs`) — Node.js, cross-platform
| 훅 | 동작 |
|---|---|
| `SessionStart` / `PreCompact` / `UserPromptSubmit` | 하네스 컨텍스트·non-negotiable 주입 |
| `PreToolUse(Bash)` | 파괴적/force-push/원격실행 차단, 인스톨러 확인 |
| `PreToolUse(Edit\|Write)` | 소스에 raw input 필드명 추가 시 프라이버시 검토 요구 |
| `PostToolUse(Edit\|Write)` | ts/tsx/rs/js/css/html 변경 시 후속 게이트 안내 |
| `Stop` | 필수 하네스 문서 누락 시 종료 차단 (strict 모드: 미커밋도 차단) |
| `SubagentStop` | 하위 작업 결과 요약 (advisory) |

검증: `npm run hooks:test` (30 케이스). 훅·설정 변경 전 항상 통과.

### D. 런타임 산출물 (피처별, git 추적)
- `docs/spec/{name}_s1.md` / `_s2.md` — Stage 1·2 설계 (Context Carry, Phase Contract).
- `docs/spec/{name}_harness_ledger.md` — Phase Status / Decision Log / Escalation Log / Scope Discovery Log. Phase 커밋에 번들.
- `docs/spec/{name}_harness_retrospective.md` — 모든 Phase 완료 후 작성, 마지막 Phase 커밋에 번들.

### E. 4-Layer Test Harness (HARNESS_PLAN §6)
Fixture(synthetic aggregate) → Driver(headless·mock·sampler) → Oracle(snapshot·perceptual·SLO·scrubber) → Reporter(JUnit·HTML·대시보드).

---

## 2. 전체 흐름

### 피처 단위 (Operating Playbook)
```
Stage 0 아이데이션 → Stage 1 설계(_s1.md) → Stage 2 구현계획(_s2.md)
        ↓
[1] Classify          난이도 (FEATURE_DIFFICULTY_TIERS)
[2] Scope Evidence    게이트 매트릭스 + 데이터 인벤토리 + ADR 링크
[3] Design UX         UX/프라이버시 가이드 + 리뷰 체크리스트
[0] /harness-start    (Medium+) Readiness 검증 → Ledger 초기화/재개
[4] Implement         Phase 오케스트레이션 (아래 루프)
[5] Verify            focused/contract/E2E/scrubber/migration 증거
[6] Handoff           Feature Quality Note + 잔여 리스크
[7] Retrospective     (Medium+) 회고 작성·번들
```

### CI 케이던스 (gate 실행 시점)
```
PR(10분)        : typecheck · unit · contract · privacy smoke · E2E smoke 3종
Nightly         : full E2E · 2h soak · privacy full scan · flaky 재실행
Weekly          : 8h all-day soak · sleep/wake 20회 · 환경 편차 sweep · gate calibration
Release         : SLO 충족·migration·rollback 증거
```

### 데이터 파이프라인 (제품 측)
```
rdev::listen ─► input.handle_input_event ─► AppState (aggregate-only)
                                                  │
                          emit("input-event"|"level-up"|...)
                                                  ▼
                                      main.ts ─► state.ts ─► CanvasManager
```
하네스는 이 경로 전 구간을 deterministic 으로 검증하고, raw payload 가 fixture/log/artifact 로 새지 않게 차단.

---

## 3. 핵심 루프

### A. Phase 오케스트레이션 루프 (`harness-entry`)
각 Phase 마다 반복:
```
Contract 로드(전제·인수·루프예산·롤백·스코프·에스컬레이트)
  → 전제조건 체크 (실패 시 Escalation)
  → 서브에이전트 실행
  → 인수조건 검증
  → Ledger 갱신(✅) + 커밋 번들
  → 다음 Phase
루프예산 초과 → 정지 + Escalation Log + 사용자 질문
```

### B. Scope Discovery 루프 (Playbook §Scope Discovery)
Phase 중 새 의존성 발견:
```
즉시 자동 진행 중단
  → s1 Context Carry 기각사유와 비교
      Match     → 자율 결정, Scope Discovery Log 기록 후 재개
      No match  → Escalation + 사용자 답변 대기
인수조건 변경 동반 시 Phase Contract 갱신·재검증
```

### C. Review Response 루프 (Playbook §Review Response)
PR 코멘트·CI 실패·사용자 피드백·Scope Discovery 동일 처리:
```
분류 (Logic/Style/Architecture/Performance/Unclassified)
  → Logic·Architecture·Performance → Decision Log 기록 + 수정
  → Unclassified                    → Escalation Log + 사용자 질문
영향 Phase 재검증
```

### D. Loop Budget 안전 장치
- 같은 실패 자동 수정 **3회**, 같은 입력 재실행 **2회** 초과 → 정지하고 사용자 보고.
- 훅은 시간·출력 예산 보유. 초과 시 차단 대신 "수동 확인 필요"로 전환.
- Claude Code 파일 반복 수정 시 diff 크기·동일 라인 재수정·실패 반복 추적.

---

## 4. 특이사항

### 절대 규칙 (Non-negotiables)
- **Aggregate-only**: 키 값/타이핑 문자열/클릭 좌표/커서 경로/창 제목/앱별 입력 내용/사용자 콘텐츠 스크린샷 저장 금지.
- **Privacy scrubber**: 모든 티어에서 touched artifact 차단 게이트.
- **Lifecycle cleanup**: 새 timer/listener/worker/subscription 은 생성·해제 테스트 필수.
- **Persisted schema 변경**: old/new/corrupt/missing-field 증거 + rollback 경로 필수.
- **Loop budget**: 동일 실패 자동 수정 3회, 재실행 2회 초과 시 정지·문의.

### 정지 조건 (Stop & Ask)
프라이버시 예외 / High 티어 상향 / 마이그레이션·공개 API·persisted schema 변경 / loop budget 초과 / 장시간 검증 / 파괴적 변경 / 게이트가 제품·하네스·환경 중 어디 문제인지 설명 못 할 때 / Scope Discovery 가 Context Carry 와 unmatched.

### 세 개의 직교 축 (혼동 주의 — `GLOSSARY.md`)
| 축 | 값 | 의미 |
|---|---|---|
| Gate cadence | PR / Nightly / Weekly / Release | 게이트 실행 시점·블로킹 |
| Rollout phase | Phase 0–5 | 하네스 자체 구축 단계 |
| Day plan | D1–D14 | 초기 구축 캘린더 |
| Difficulty tier | Low / Medium / High | 피처별 증거 범위 |

피처는 **하나의 tier** 를 갖고, 해당하는 **gate 부분집합** 을 특정 **cadence** 로 통과한다.

### Strict mode
`PIXEL_HORIZON_STRICT_STOP=1` → `Stop`/`SubagentStop` 이 미커밋 변경에서 차단하고 핸드오프 스냅샷 강제. 기본 off.

### Plan Review (외부 송신 주의)
`gemini-review` MCP 의 `review_plan` 호출 시 파일 본문이 Google Gemini 로 전송된다. 자격증명·원본 입력·내부 경로 포함 파일에는 사용 금지.

### 성능 예산
앱 자체: idle CPU < 1%, memory < 50 MB, event-driven (no polling). 하네스 게이트는 이 예산을 회귀 차단.
