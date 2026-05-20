---
role: reference
portability: portable
---

# Pixel Horizon 하네스 구축 계획 (UX/상주 안정성/프라이버시/Claude Code 중심 v11)

## 1) 목표 (Outcome)
- 문서 진입점은 `docs/harness/README.md`, 실제 작업 절차는 `docs/harness/HARNESS_OPERATING_PLAYBOOK.md`를 기준으로 한다.
- 입력 수집(Rust/Tauri) → 상태 전이(Frontend) → 캔버스 렌더링 전체 경로를 **결정론적(deterministic)** 으로 검증한다.
- PR 단계에서 회귀를 조기 차단하고, 릴리스 전에는 성능/안정성/호환성을 수치로 보증한다.
- 실패 아티팩트를 자동 수집해 MTTD/MTTR을 단축한다.
- **최우선 목표: 사용자 체감 품질(UX) 저하를 사전에 차단한다.**
- 데스크탑/랩탑에서 백그라운드 상시 실행되는 앱으로서, 사용 시간이 길어져도 자원 누수와 상태 드리프트가 사용자 문제로 번지지 않도록 보증한다.
- 신규 기능은 "요구 기능 정확성, UI/UX 품질, 안정 구동, 개인 프라이버시 보호"를 모두 만족해야 완료로 인정한다.
- 주 작업 환경인 Claude Code에서 스킬/훅을 통해 품질 기준을 반복 가능하고 자동화된 개발 워크플로우로 만든다.
- 하네스 기반 자동화 작업이 장시간 이어져도 현재 상태, 의사결정, 중단 조건, 사용자 개입 지점을 명확히 남긴다.
- 배포 후에도 복구성, 데이터 무결성, 하네스 신뢰도, 데스크탑 환경 편차, 보안 경계가 품질 저하로 이어지지 않도록 검증한다.

## 2) 비목표 (Non-goals)
- 실제 사용자 OS 권한(접근성/입력 모니터링) 자체의 완전 자동화 테스트는 1차 범위에서 제외.
- 픽셀 퍼펙트 시각 동일성은 제외(퍼셉추얼 해시 임계치 기반).

## 3) UX 중심 성공 기준 (SLO / Quality Gate)

### A. 체감 반응성
- 입력 → 캔버스 반영 지연
  - P50 < 50ms
  - P95 < 120ms
  - P99 < 200ms
- 연속 입력 구간에서 프레임 드랍 비율 < 1%

### B. 안정성/신뢰성
- 앱 비정상 종료율(crash-free session) 99.9%+
- 이벤트 유실률(dropped-event ratio) < 0.1%
- E2E 스모크 5개 시나리오 100% 통과
- 8시간 synthetic long-run에서 비정상 종료/강제 재시작 0건

### C. 상주 실행 자원 안정성
- 백그라운드 idle CPU 평균 < 2%, P95 < 5%
- 메모리 RSS/heap은 warm-up 이후 2시간 이동 구간에서 +10% 이내로 plateau
- OS handle/thread/timer count는 2시간 이동 구간에서 +5% 이내로 plateau
- 이벤트 큐 backlog는 idle 복귀 후 30초 내 정상 범위로 회복
- 로그/캐시/아티팩트 디스크 증가량은 일일 상한 내 유지하고 자동 회전 검증

### D. 일관성/예측 가능성
- 동일 seed+fixture에서 결과 digest 100% 동일
- 계약(Contract) 테스트 100% 통과(브레이킹 0건)

### E. 접근성/사용 피로도
- 설정 모달 키보드 탐색(탭 순서) 100% 정상
- 알림/토스트 초당 발생량 상한(과다 알림 방지)
- 권한 미허용 상태에서도 사용자 안내 플로우 정상(막힘 없음)

### F. 프라이버시 보호
- 키보드/마우스 입력은 필요한 최소 단위의 카운트/집계만 수집하고, 키 값/문자열/클릭 좌표/앱별 상세 입력 내용은 저장하지 않는다.
- fixture, 로그, 실패 아티팩트, 대시보드에는 원본 입력 이벤트 payload가 포함되지 않아야 한다.
- 로컬 저장 데이터는 목적, 보관 기간, 삭제 경로가 명확해야 하며 민감 데이터는 기본 비수집을 원칙으로 한다.
- 신규 권한 요청은 기능에 꼭 필요한 경우만 허용하고, 사용자에게 목적과 영향이 명확히 보이도록 검증한다.

### G. 복구성/데이터 무결성/보안 경계
- 재시작, interrupted write, stale cache, retry, migration 이후에도 데이터 손실과 중복 집계가 없어야 한다.
- persisted schema 변경은 old/new/corrupt/missing-field 케이스와 rollback 또는 downgrade 방침을 가진다.
- 새 하네스 게이트는 known-failing sample 또는 negative fixture로 실패 경로를 먼저 증명한다.
- 리포트, 대시보드, hook, export, updater, plugin은 secret/token/로컬 사용자명/private path/외부 실행 경계를 검증한다.

## 4) 신규 기능 완료 기준 (Feature Quality Gate)
신규 기능은 구현 완료 전에 아래 4개 축을 모두 통과해야 한다.

### 난이도 기반 적용 원칙
- 모든 기능은 구현 전에 `Low / Medium / High` 난이도로 분류하고 `docs/harness/FEATURE_DIFFICULTY_TIERS.md` 기준에 맞춰 증거 수준을 조정한다.
- Low 난이도는 focused validation으로 빠르게 끝내되, privacy 문구/아티팩트를 건드리면 privacy scrubber는 항상 통과해야 한다.
- Medium 난이도는 PR 단계의 표준 게이트를 적용하고, background lifecycle을 건드리는 경우 nightly soak를 조건부로 연결한다.
- High 난이도는 전체 품질 게이트, ADR, Data Inventory, lifecycle test, nightly/weekly soak, 사용자 pause point를 요구한다.
- 작업 중 privacy, background lifecycle, persisted schema, permission, cross-layer contract 영향이 발견되면 즉시 난이도를 상향 조정한다.

### A. 요구 기능 정확성
- 요구사항을 Given/When/Then 형태의 acceptance case로 분해하고, 각 case는 unit/contract/e2e 중 하나 이상의 테스트와 연결한다.
- 추적표는 `docs/harness/QUALITY_GATE_MATRIX.md`를 사용해 요구사항, 테스트, 증거, 남은 리스크를 한 곳에 묶는다.
- 성공 경로뿐 아니라 권한 거부, 빈 상태, 오류 응답, 재시도, 백그라운드 복귀 같은 예외 경로를 포함한다.
- 기존 상태 전이, 이벤트 payload, 저장 포맷을 변경하는 경우 하위호환 contract test를 추가한다.

### B. UI/UX 직관성 및 일관성
- 기존 화면 구조, 용어, 단축 흐름, 알림 패턴과 일관되어야 한다.
- 사용자가 다음 행동을 추측할 수 있도록 primary action, disabled/loading/error/empty 상태를 모두 설계하고 검증한다.
- 기능 추가 후에도 입력 지연, 프레임 드랍, 알림 피로도 기준을 악화시키지 않는다.

### C. 안정적인 구동
- 기능이 백그라운드 상주, 장시간 idle, sleep/wake, 네트워크/display 변경 이후에도 동일하게 동작해야 한다.
- 새 타이머, listener, worker, cache, subscription은 생성/해제 lifecycle 테스트를 포함한다.
- 실패 시 앱 전체를 중단하지 않고 사용자에게 복구 가능한 상태를 제공한다.

### D. Privacy by Design
- 기능 설계 단계에서 수집 데이터 목록을 작성하고, 각 항목에 대해 목적/보관 위치/보관 기간/삭제 방식을 명시한다.
- 데이터 인벤토리는 `docs/harness/DATA_INVENTORY_TEMPLATE.md`를 사용한다.
- 키 입력과 마우스 입력은 count, rate, duration 등 집계값만 사용한다. 원본 키, 입력 문자열, 클릭 좌표, 창/앱별 상세 내용은 기록하지 않는다.
- 집계 단위가 너무 촘촘해 개인 행동을 재식별할 수 있는 경우 별도 privacy review와 ADR을 요구한다.
- 테스트 fixture도 실제 사용자 입력을 닮은 원문 데이터 대신 synthetic aggregate event를 사용한다.
- 실패 로그와 리포트는 privacy scrubber를 통과해야 하며, scrubber 실패 시 CI를 실패 처리한다.

## 5) UX 리스크 시나리오(우선 검증)
1. **Burst Typing**: 빠른 타이핑 시 렌더 지연/드랍 발생
2. **Long Session**: 장시간 사용 시 메모리 누수/지연 누적
3. **Permission Denied**: 권한 거부 시 사용자 안내 혼선
4. **Background/Resume**: 백그라운드 전환 후 복귀 시 상태 불일치
5. **Notification Flood**: 과도한 알림으로 사용 흐름 방해
6. **All-day Resident Idle**: 하루 업무 시간 동안 백그라운드 상주 시 CPU/메모리/핸들 누적
7. **Sleep/Wake Cycle**: 랩탑 절전/깨우기 반복 후 타이머 중복, 이벤트 재처리, 연결 상태 오판
8. **Network/Display Change**: 네트워크 전환, 모니터 연결 변경, DPI 변경 후 렌더/상태 불안정
9. **Log/Cache Growth**: 장시간 실행으로 로그/캐시가 무제한 증가해 디스크와 성능을 압박
10. **Crash/Restart Recovery**: 작업 중 재시작 후 중복 처리, 누락, stuck 상태 발생
11. **Migration/Rollback**: 저장 포맷 변경 후 old/corrupt 데이터 처리 실패 또는 rollback 불가
12. **Harness Drift**: 제품 변경이 아니라 baseline/fixture/oracle 노후화로 잘못된 실패 또는 잘못된 통과 발생
13. **Battery/Locale/Timezone Variance**: 절전 모드, 시간대/일광절약/locale 변경으로 요약과 스케줄이 어긋남
14. **Report/Hook Security Leak**: 리포트나 hook 출력에 secret, token, 로컬 사용자명, private path가 노출

## 6) 검증 계층(4-Layer Harness)

### A. Fixture Layer
- `tests/fixtures/events/*.json`
- 시퀀스: `idle`, `burst_typing`, `click_heavy`, `mixed`, `long_session`, `resident_idle`, `sleep_wake`, `network_display_change`, `permission_denied`, `resume`
- 공통 메타: `schema_version`, `seed`, `fps`, `duration_ms`, `platform_profile`, `power_profile`, `privacy_level`, `expected_digest`
- 입력 fixture는 synthetic aggregate event만 허용하고 원본 키/문자열/좌표 필드는 스키마에서 금지한다.

### B. Driver Layer
- Frontend: headless 실행 + fake timers + 사용자 상호작용 시뮬레이션(탭/포커스/모달)
- Tauri: `PH_TEST_MODE=1`에서 OS hook 비활성화, mock stream 주입
- Rust: `InputEventSource` 추상화로 mock/real 스위칭
- 상주 안정성: synthetic clock, sleep/wake hook mock, network/display profile mock, long-run sampler 주입
- 프라이버시: raw input sink를 테스트 모드에서 차단하고 aggregate counter만 통과시키는 guard 주입

### C. Oracle Layer
- 기능 정확성: 상태 스냅샷(JSON canonicalize)
- 시각 정확성: perceptual hash + 실패 시 diff
- UX 품질: latency histogram, frame drop, queue depth, dropped-event, toast rate
- 상주 안정성: RSS/heap, CPU, handle/thread/timer count, queue backlog, log/cache bytes, wake/resume recovery time
- 프라이버시: raw input field 검출, log/artifact scrubber, 저장소 민감 데이터 스캔
- 복구성/무결성: interrupted write, restart replay, stale cache, migration, rollback, double-counting 검증
- 하네스 신뢰도: known-failing fixture, baseline expiry, flaky 분리, oracle drift 검출
- 보안 경계: secret/token/private path/local username scrub, hook/plugin/updater trust 검증

### D. Reporter Layer
- JUnit XML + HTML 리포트
- 실패 아티팩트: 로그/스냅샷/diff/메트릭(JSON)
- UX 회귀 전용 대시보드(지연/프레임드랍/유실률 추이)
- 상주 안정성 대시보드(메모리/CPU/핸들/로그 증가율, 절전 복귀 회복 시간, long-run slope)
- 프라이버시 리포트(수집 데이터 목록, scrubber 결과, raw input 필드 0건 보증)

## 7) 테스트 피라미드 (UX 관점 가중치)
- Unit (다수): 상태 전이/유틸/알림 쓰로틀링/권한 분기
- Contract (중간): invoke/event payload 및 하위호환
- E2E (소수, 강한 신뢰): 실제 사용자 플로우(권한, 설정, 장시간 세션, 복귀)
- Soak/Resident (야간): 2~8시간 상주 실행, 절전/복귀 반복, 자원 증가율과 회복성 검증
- Privacy (필수): schema denylist, log/artifact scrubber, raw input 저장 금지, 권한 문구 검증

## 8) CI 전략

### PR 파이프라인 (10분 예산)
1. typecheck + lint
2. unit + contract 병렬
3. privacy guard(schema denylist + log/artifact scrubber smoke)
4. e2e smoke(UX 핵심 3개: burst_typing / permission_denied / resume)
5. 실패 시 아티팩트 업로드

### Nightly 파이프라인
- full e2e(전체 UX 시나리오)
- 성능/UX 회귀 비교(전일 baseline 대비)
- 2시간 resident soak: idle CPU, memory/handle slope, log/cache growth 게이트
- privacy full scan: fixture/log/artifact/storage schema에서 raw input 필드 0건 확인
- flaky 재실행(최대 2회), quarantine 후보 리포트

### Weekly 파이프라인
- 8시간 all-day soak: 업무일 기준 백그라운드 상주 안정성 검증
- sleep/wake 20회 반복, 네트워크/DPI/display profile 변경 10회 반복
- 장기 추세 리포트: 최근 4주 memory/CPU/handle/log slope 비교
- recovery/migration/platform variance sweep: 재시작, interrupted write, stale cache, battery saver, timezone/locale 케이스 검증
- gate calibration review: 신규 blocking gate의 negative sample과 baseline 만료 여부 확인

## 9) Claude Code 작업 체계 (Skills / Hooks)
Claude Code에서의 목표는 "좋은 프롬프트"에 의존하는 것이 아니라, 매 작업마다 동일한 품질 기준이 자동으로 주입되고 검증되는 구조를 만드는 것이다.

### A. Project Skills
- `feature-quality-gate`: 신규 기능 요청을 acceptance case, UI 상태, 안정성 리스크, privacy impact로 분해한다.
- `desktop-resident-stability`: 타이머/listener/worker/cache/subscription 변경 시 lifecycle, sleep/wake, long-run 리스크를 점검한다.
- `privacy-by-design`: 키/마우스 원본 입력, 문자열, 좌표, 앱별 상세 입력 저장을 금지하고 aggregate-only 설계를 강제한다.
- `ux-review`: 기존 화면 구조, 용어, 빈 상태, 로딩, 오류, disabled 상태, 알림 피로도, 접근성을 검토한다.
- `test-harness-author`: fixture/schema/oracle/reporter 변경을 기존 하네스 계층에 맞춰 추가한다.

### B. Hook 정책
- `SessionStart`: 현재 작업 규칙, privacy 원칙, 최근 변경 파일, 미완료 체크리스트를 컨텍스트로 주입한다.
- `UserPromptSubmit`: 신규 기능/수정 요청이면 acceptance template을 자동 첨부하고, privacy 영향 질문을 누락하지 않게 한다.
- `PreToolUse(Bash)`: 위험 명령, 광범위 삭제, 외부 전송, secret 출력, raw input 로그 생성 가능성이 있는 명령을 차단하거나 확인 요구한다.
- `PreToolUse(Edit|Write)`: raw input 필드명(`key`, `keyCode`, `text`, `char`, `mouseX`, `mouseY`, `windowTitle` 등) 추가를 감지하면 privacy 검토를 요구한다.
- `PostToolUse(Edit|Write)`: 변경 파일에 맞는 formatter, schema denylist, privacy scrubber, focused test 추천 또는 실행을 트리거한다.
- `Stop`: 완료 전 acceptance case, UI 상태, 안정성, privacy, 테스트 결과가 누락되면 종료를 막고 다음 행동을 피드백한다.
- `PreCompact`: 현재 목표, 결정사항, 검증 결과, 남은 리스크를 요약해 장시간 작업 중 맥락 손실을 줄인다.
- `Notification`: 사용자 확인이 필요한 권한 상승, 설계 변경, privacy 예외, 반복 실패, 예산 초과를 짧게 알린다.
- `SubagentStop`: 병렬/하위 작업이 끝날 때 변경 범위, 검증 결과, 미해결 리스크를 상위 작업 상태에 합친다.

### C. Claude Code 산출물 규칙
- 신규 기능 PR/작업 단위마다 `Feature Quality Note`를 남긴다: 요구사항 매핑, UI 상태, 안정성 영향, privacy 영향, 검증 결과.
- privacy 관련 변경은 `Data Inventory`를 갱신한다: 데이터명, 집계 수준, 저장 위치, 보관 기간, 삭제 경로.
- hook은 프로젝트 설정에 들어가기 전 코드 리뷰 대상이며, 임의 원격 다운로드/실행, secret 접근, 외부 전송을 금지한다.
- project hook은 deterministic하고 빠르게 유지한다. 장시간 soak는 hook에서 직접 실행하지 않고 CI/Nightly 작업으로 연결한다.

### D. 권장 파일 구조
- `.claude/skills/feature-quality-gate/SKILL.md`
- `.claude/skills/privacy-by-design/SKILL.md`
- `.claude/skills/desktop-resident-stability/SKILL.md`
- `.claude/skills/harness-workflow-control/SKILL.md`
- `.claude/hooks/pre_tool_privacy_guard.*`
- `.claude/hooks/post_edit_quality_gate.*`
- `.claude/hooks/stop_exit_check.*`
- `.claude/hooks/session_status_snapshot.*`
- `.claude/hooks/loop_budget_guard.*`
- `.claude/settings.json`

## 10) 하네스 작업 운영 장치
하네스 작업은 테스트 생성, fixture 보정, 실패 재현, 리포트 개선이 반복되기 쉽다. 아래 장치로 진행 상태와 중단 기준을 명시한다.

### A. 작업 상태 스냅샷
- 모든 작업 단위는 `Goal / Current Step / Changed Files / Commands Run / Evidence / Blockers / Next Action` 형식의 짧은 상태를 유지한다.
- 표준 템플릿은 `docs/harness/WORK_STATUS_TEMPLATE.md`를 사용한다.
- Claude Code `SessionStart`, `Stop`, `PreCompact` 시점에 상태 스냅샷을 갱신한다.
- 30분 이상 이어지는 작업은 사용자에게 현재 단계, 남은 리스크, 다음 검증을 간단히 보고한다.
- 실패 아티팩트와 상태 스냅샷은 같은 run id로 묶어 나중에 원인 분석이 가능해야 한다.

### B. ADR(Architecture Decision Record)
- 하네스 구조, fixture schema, oracle 기준, privacy policy, CI gate, Claude Code hook 정책을 바꾸는 결정은 ADR로 남긴다.
- ADR은 `docs/harness/adr/NNNN-title.md`에 저장하고 `Status / Context / Decision / Consequences / Alternatives / Validation`을 포함한다.
- ADR 템플릿은 `docs/harness/adr/TEMPLATE.md`를 사용하고, 최초 기준 결정은 `docs/harness/adr/0001-harness-quality-gate-and-privacy-policy.md`로 기록한다.
- 임시 결정은 `Proposed`, 적용 결정은 `Accepted`, 폐기 결정은 `Superseded` 상태로 관리한다.
- PR 설명과 `Feature Quality Note`에는 관련 ADR 링크를 포함한다.

### C. 무한 루프 방지 안전 장치
- 동일 실패에 대한 자동 수정 시도는 기본 3회로 제한하고, 이후에는 원인 가설/증거/다음 선택지를 사용자에게 보고한다.
- 동일 테스트 재실행은 같은 입력과 같은 코드 상태에서는 2회까지만 허용한다. 이후에는 fixture, seed, 환경, 로그 차이를 먼저 분석한다.
- hook은 실행 시간과 출력 크기 예산을 가진다. 예산 초과 시 작업을 차단하지 않고 "수동 확인 필요" 상태로 전환한다.
- flaky 테스트는 무한 재시도하지 않고 quarantine 후보로 기록하며, 사용자 영향도가 높은 경우 즉시 수정 대상으로 승격한다.
- Claude Code가 파일을 반복 수정할 때는 diff 크기, 같은 라인 재수정 횟수, 테스트 실패 반복 횟수를 loop budget으로 추적한다.

### D. 사용자 중단/개입 장치
- destructive change, privacy 예외, 권한 상승, 장기 soak 실행, public API/저장 포맷 변경은 사용자 확인 없이는 진행하지 않는다.
- 작업 상태 스냅샷에는 `Pause Point`를 둔다. 사용자는 해당 지점에서 중단, 범위 축소, 우선순위 변경을 요청할 수 있어야 한다.
- 장시간 실행 명령은 예상 시간, 중단 방법, 중간 산출물 위치를 먼저 명시한다.
- 사용자 중단이 들어오면 현재 변경 파일, 실행 중이던 검증, 보존해야 할 아티팩트, 되돌리면 안 되는 사용자 변경을 요약한다.

## 11) 단계별 로드맵 (2주)
- 실행 순서는 `docs/harness/IMPLEMENTATION_SEQUENCE.md`를 기준으로 Phase 0~5를 따른다.
- 개별 기능 작업은 `docs/harness/HARNESS_OPERATING_PLAYBOOK.md`의 Classify → Scope Evidence → Design → Implement → Verify → Handoff 흐름을 따른다.
- 주요 하네스 기능은 적용 전에 `docs/harness/simulations/`에 가상 기능 시뮬레이션을 남기고, 발견된 빈틈을 문서/게이트에 반영한다.
- 신규 기능은 `docs/harness/FEATURE_DIFFICULTY_TIERS.md`에 따라 난이도별로 게이트를 조절한다.
- **D1**: 테스트 스크립트/fixture 스키마 정리
- **D2~D4**: 단위 테스트 + seed 주입 + 알림 쓰로틀링 + privacy schema denylist 검증
- **D5~D6**: 계약 테스트 + 브레이킹 차단
- **D7~D9**: UX 중심 E2E(권한/복귀/장시간) + 메트릭 수집
- **D10~D11**: resident soak fixture/driver + 자원 sampler 추가
- **D12~D13**: sleep/wake, 네트워크/display 변경, 로그/캐시 회전 검증
- **D14**: 게이트 하드닝 + 운영 가이드 배포

## 12) 운영 모델 (Owner / Runbook)
- FE: UX 시나리오/렌더링 품질
- BE(Rust/Tauri): 입력 파이프라인/이벤트 안정성
- DevEx: CI 게이트/아티팩트/대시보드
- Platform: OS별 상주 실행 자원, sleep/wake, 로그/캐시 회전 정책
- Privacy: 데이터 최소 수집, 로그/아티팩트 scrubber, 권한 문구, 보관/삭제 정책
- AI Workflow: Claude Code 스킬/훅, 작업 템플릿, 자동 품질 피드백, hook 보안 리뷰, 상태 스냅샷, loop budget
- Architecture: ADR 작성/갱신, 의사결정 상태 관리, 대안과 검증 근거 보존
- Security: hook/plugin/updater/export/report의 secret 노출, private path 노출, 외부 실행 경계 검토
- Data Integrity: migration/rollback, stale cache, interrupted write, duplicate aggregate 방지 검토

Runbook
1. 실패 분류(정확성/지연/안정성/상주 자원/프라이버시/환경)
2. 재현 명령 1줄 제공
3. 48시간 내 수정 또는 quarantine
4. 사용자 영향 등급(High/Med/Low) 기록
5. long-run 실패는 slope, 시작/종료 스냅샷, peak 구간, sleep/wake 직후 구간을 함께 첨부
6. privacy 실패는 raw field 위치, 유입 경로, 삭제/마이그레이션 필요 여부를 함께 기록
7. Claude Code hook 실패는 차단 사유, 우회 필요성, hook 오탐 여부, 재발 방지 규칙을 기록
8. 반복 실패는 시도 횟수, 바뀐 가설, 추가로 필요한 사용자 결정을 기록하고 자동 수정을 멈춘다.
9. 구조적 결정은 관련 ADR 번호를 남기고, ADR 없이 gate/hook/schema를 바꾸지 않는다.
10. harness drift가 의심되면 제품 코드를 고치기 전에 fixture, oracle, baseline, negative sample의 최신성을 먼저 검토한다.

## 13) 즉시 실행 백로그 (우선순위)
1. `PH_TEST_MODE` + `InputEventSource` 추상화
2. UX/resident fixture 10종(`permission_denied`, `resume`, `long_session`, `resident_idle`, `sleep_wake` 포함)
3. `PixoFSM`/notification/권한 분기 단위 테스트 강화
4. latency/frame-drop/dropped-event 계측 포인트 추가
5. 캔버스 hash+diff 유틸 + UX 메트릭 아티팩트 업로드
6. RSS/heap/CPU/handle/thread/timer/log-cache sampler 추가
7. sleep/wake, network/display change mock driver 추가
8. raw input 필드 denylist, privacy scrubber, aggregate-only fixture schema 추가
9. `docs/harness/QUALITY_GATE_MATRIX.md` 기반 신규 기능 acceptance/evidence trace 작성
10. `docs/harness/HARNESS_OPERATING_PLAYBOOK.md`를 Claude Code 작업 시작 루틴과 PR 템플릿에 연결
11. `docs/harness/FEATURE_DIFFICULTY_TIERS.md` 기준 난이도 triage를 Claude Code 작업 시작 루틴에 연결
12. `docs/harness/FEATURE_QUALITY_NOTE_TEMPLATE.md`를 PR/task output에 연결
13. Claude Code project skills 5종과 hook 4종(`privacy_guard`, `post_edit_quality_gate`, `stop_exit_check`, `session_context`) 초안 작성
14. 작업 상태 스냅샷 템플릿, loop budget guard, 사용자 pause point 정책 추가
15. `docs/harness/UX_PRIVACY_DESIGN_GUIDE.md`와 `docs/harness/FEATURE_REVIEW_CHECKLIST.md`를 신규 기능 리뷰에 연결
16. `docs/harness/DATA_INVENTORY_TEMPLATE.md`로 privacy 관련 기능의 데이터 목록 관리
17. `docs/harness/IMPLEMENTATION_SEQUENCE.md`에 따라 Phase별 차단 게이트를 순차 적용
18. PR/Nightly/Weekly 분리 게이트 및 UX/resident/privacy 대시보드 연결
19. recovery/degraded-mode fixture(`restart_replay`, `interrupted_write`, `stale_cache`, `migration_old_schema`) 추가
20. known-failing sample 기반 gate calibration과 baseline expiry 정책 추가
21. report/hook/export secret/path/token scrubber와 security boundary review 추가

## 14) 승인(Exit) 체크리스트
- [ ] `docs/harness/HARNESS_OPERATING_PLAYBOOK.md` 흐름에 따라 classify/scope/design/verify/handoff가 완료됨
- [ ] 신규 기능 acceptance case가 요구사항과 1:1로 연결됨
- [ ] 기능 난이도 Low/Medium/High와 상향/하향 근거가 기록됨
- [ ] `docs/harness/QUALITY_GATE_MATRIX.md`에 요구사항, 테스트, 증거, 남은 리스크가 정리됨
- [ ] `docs/harness/FEATURE_QUALITY_NOTE_TEMPLATE.md` 기준으로 PR/task handoff 작성됨
- [ ] `docs/harness/FEATURE_REVIEW_CHECKLIST.md` 기준으로 UI/UX, 안정성, privacy 리뷰 완료
- [ ] 주요 UI 상태(default/loading/empty/error/disabled/success) 검증 완료
- [ ] 입력 지연 P95 < 120ms 충족
- [ ] dropped-event ratio < 0.1% 충족
- [ ] 권한 거부/복귀/장시간/상주 idle 시나리오 100% 통과
- [ ] 2시간 resident soak에서 memory/handle/thread/timer 증가율 기준 충족
- [ ] 8시간 weekly soak에서 crash/restart 0건, idle CPU 기준 충족
- [ ] sleep/wake 반복 후 이벤트 큐와 렌더 상태가 30초 내 정상 회복
- [ ] 로그/캐시 일일 증가량과 회전 정책 기준 충족
- [ ] 키/마우스 원본 입력값, 문자열, 좌표, 앱별 상세 입력 내용 저장 0건
- [ ] fixture/log/artifact/storage schema privacy scrubber 통과
- [ ] `docs/harness/DATA_INVENTORY_TEMPLATE.md` 기준으로 수집 데이터의 목적/보관 위치/보관 기간/삭제 경로 문서화
- [ ] 집계 granularity와 재식별 위험이 privacy review에서 승인됨
- [ ] Claude Code `Stop` hook 기준상 acceptance/UI/안정성/privacy/test 누락 0건
- [ ] Claude Code hook이 raw input/secret/위험 명령을 차단하고 오탐 우회 절차가 문서화됨
- [ ] 작업 상태 스냅샷으로 현재 상태/증거/다음 행동을 1분 안에 파악 가능
- [ ] gate/hook/schema/privacy 관련 구조적 결정은 ADR로 기록됨
- [ ] 반복 실패/자동 수정 loop budget 초과 시 자동 중단 및 사용자 보고 동작
- [ ] 사용자 중단 요청 시 변경 범위와 보존할 아티팩트를 요약하는 pause protocol 동작
- [ ] 실패 1회로 원인 파악 가능한 아티팩트 확보
- [ ] 최근 1주 flaky 비율 < 2%
- [ ] restart/interrupted-write/stale-cache 이후 데이터 손실, stuck 상태, 중복 집계 0건
- [ ] persisted schema 변경 시 old/new/corrupt/missing-field와 rollback 근거 확보
- [ ] 신규 blocking gate는 negative sample 또는 known-failing fixture로 실패 경로 검증
- [ ] 리포트/hook/export에 secret, token, 로컬 사용자명, private path 노출 0건
- [ ] timezone/locale/battery/display variance가 관련 기능에서 검토됨
