---
kind: feat
name: harness-monitor-dashboard
stage: 2
status: active
---

# Harness Monitor Dashboard — Stage 2 구현 계획

> Stage 1 문서: `docs/spec/harness-monitor-dashboard_s1.md`
> **[하네스 테스트 목적]** Phase B 는 advisory 게이트 의도적 누락 → 발동 확인 → 복구 시나리오.

## 1. Phase 분할 (2 Phase)

영향 파일 4개 → §5.4 위임 임계 충족 → 2 Phase 분할. 사전 `[T]` 추정 미적용 (외부 IO < 3).

---

## Phase A — 스크립트 구현 + package.json + .gitignore

**작업 요지**: `scripts/generate-harness-dashboard.mjs` 신규 작성 · `package.json` 커맨드 추가 · `.gitignore` 1줄 추가.

**전제조건**
- `docs/spec/` 디렉터리 존재 (이미 존재).
- Node.js 내장 모듈만 사용 (`fs`, `path`).

**인수조건**
1. [verify: manual] 이 Phase 단독으로 main 머지 시 빌드·테스트 통과 (독립 verifiable).
2. [verify: manual] `npm run harness:dashboard` 실행 → `docs/harness/dashboard.html` 생성, 종료코드 0.
3. [verify: grep] `grep -n 'harness:dashboard' package.json` == 1.
4. [verify: grep] `grep -n 'dashboard.html' .gitignore` == 1.
5. [verify: manual] 생성된 HTML 에 현재 ledger (`harness-improve-v1`, `spec-doc-management`) 2개 feature 렌더링 확인.
6. [verify: manual] ledger 0건 환경 → 에러 없이 빈 상태 HTML 출력.
7. [verify: hooks:test] `npm run hooks:test` → 67 passed 유지.

**루프예산**: 자동 수정 3회 / 동일 입력 재실행 2회.

**롤백**: `git revert <Phase A commit>` — 스크립트·package.json·.gitignore 원복.

**서브에이전트 스코프**
- `mode: subagent` — 신규 스크립트 로직 구현 포함. 영향 파일 3개 + 기능 검증 필요.
- 작업 파일: `scripts/generate-harness-dashboard.mjs` (new) · `package.json` · `.gitignore`.
- 참조 s1 섹션: §3 데이터 흐름 / §4 영향 파일 표 #1~#4 / §5 Context Carry #1·#2·#3 / §8 엣지케이스.
- 핵심 제약: Node.js 내장만, `docs/spec/*_harness_ledger.md` glob, 인라인 CSS, `docs/harness/` mkdirSync.

**에스컬레이트 조건**
- ledger md 파싱 정규식이 Phase Status 표 형식 인식 실패 시.
- Node.js 버전 호환 문제 발생 시.
- hooks:test 회귀 발생 시.

---

## Phase B — advisory 게이트 의도적 누락 시나리오 (하네스 테스트 전용)

**[하네스 테스트 전용 Phase]** 실제 기능 변경 없음. advisory 게이트 G1·G2 발동 흐름을 의도적으로 트리거하여 harness-entry SKILL item 6·7 동작 검증.

**작업 요지**:
1. s1 §4 영향 파일 표에서 `grep -rl` 인용 컬럼 일시 제거 → `[pre-grep-trigger]` 발동 확인.
2. s2 Phase A 서브에이전트 스코프에서 `mode:` prefix 일시 제거 → `[delegation-mode-trigger]` 발동 확인.
3. `/harness-start harness-monitor-dashboard` Readiness Validation 에서 item 6·7 advisory 로그 및 ledger Decision Log 태그 기록 확인.
4. s1·s2 원상 복구 (Phase B 커밋 = 복구 커밋).

**전제조건**
- Phase A ✅ 완료.
- harness-entry SKILL item 6·7 존재 (`[pre-grep-trigger]`, `[delegation-mode-trigger]`).

**인수조건**
1. [verify: grep] ledger Decision Log에 `[pre-grep-trigger]` 기록 == 1.
2. [verify: grep] ledger Decision Log에 `[delegation-mode-trigger]` 기록 == 1.
3. [verify: grep] 원상 복구 후 s1 §4 영향 파일 표에 `grep -rl` 인용 흔적 존재 ≥ 1.
4. [verify: grep] 원상 복구 후 s2 Phase A 서브에이전트 스코프 첫 줄에 `mode: subagent` 존재 == 1.
5. [verify: hooks:test] `npm run hooks:test` → 67 passed 유지.

**루프예산**: 자동 수정 3회 / 동일 입력 재실행 2회.

**롤백**: s1·s2 원상 복구가 Phase B 커밋 자체에 포함.

**서브에이전트 스코프**
- `mode: main-direct` — s1·s2 md 파일 일시 편집 + Readiness Validation 재실행 + 복구. 단순 텍스트 조작.
- 참조 s1 섹션: §5 Context Carry #5 (Phase B 목적 명시).

**에스컬레이트 조건**
- harness-entry SKILL item 6·7 이 ledger 기록 없이 무시될 때 (게이트 미작동 — 버그 발견).
- Readiness Validation 이 advisory 발동 없이 통과할 때.

---

## 2. 테스트 체크리스트

- `npm run harness:dashboard` → HTML 출력 + 2개 feature 렌더링.
- advisory 태그 발동 카운트가 HTML에 표시 (기존 발동 카운트 반영).
- `npm run hooks:test` → 67 passed.
- Phase B: ledger Decision Log 태그 2종 기록 확인.

## 3. 안전장치·롤백

- Phase B 는 s1·s2 일시 변경 → 복구 커밋으로 정리. ledger 태그 기록이 목적.
- `dashboard.html` gitignore → 리포 오염 없음.
- Phase A·B 단일 PR 묶음 머지.

## 4. 리스크·열린 이슈

- **R1** ledger Phase Status 표 파싱: 이모지 멀티바이트 (`✅` 등) 처리 주의. **완화**: 인수조건 #5·#6 실측으로 검증.
- **R2** Phase B advisory 발동이 실제 발동 카운트로 집계 — 정상 (테스트 목적 명시). Phase B 커밋 메시지에 "테스트 목적" 명시.
- **R3** s2 서브에이전트 스코프 `mode: subagent` 지정 시 §5.4 위임 임계 조건 (영향 파일 3개 < 4) 에서 위임 필요성 경계. **완화**: 신규 스크립트 로직 구현이므로 subagent 적합.
