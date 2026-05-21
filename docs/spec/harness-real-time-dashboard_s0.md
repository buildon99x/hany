---
kind: feat
name: harness-real-time-dashboard
stage: 0
status: complete
---

# Harness Real-Time Dashboard — Stage 0 Ideation

> 이전 Stage 문서: 해당 없음 (신규).
> 관련 선행 산출물: `docs/spec/harness-monitor-dashboard_s1.md` (정적 HTML 일회성 생성, `npm run harness:dashboard`). 본 피처는 별개 신규 피처로 진행하되, 렌더링 로직 공유 가능성은 Stage 1 에서 검토.

## 1. 컨셉

하네스 작업 상태(Phase, Loop Budget, advisory 태그, 직전 커밋)를 **터미널 TUI** 로 실시간 모니터링. `npm run harness:watch` 한 줄 실행 → 별도 터미널 창에서 ANSI 화면 리프레시. 새 데이터 수집·로깅 0건 — 기존 `docs/spec/*_harness_ledger.md` 와 `git log` 만 읽는다.

심플 기조 유지: 서버 없음 · 포트 없음 · 외부 의존성 0 · Node.js 내장만.

## 2. 범위 결정 — 옵션 A (TUI watch) 채택

| 옵션 | 결정 | 사유 |
|---|---|---|
| **A. TUI watch (채택)** | ✅ | 사용자가 가장 자주 보는 화면(터미널) 위, 라이프사이클 단일 종료점(Ctrl+C), 의존성 0 |
| B. HTML auto-refresh | ❌ 기각 | 풀 페이지 reload 깜빡임 · `harness-monitor-dashboard` 가 이미 정적 HTML 커버 |
| C. 로컬 SSE 서버 | ❌ 기각 | 포트 관리·서버 라이프사이클 — "심플" 요구사항에 비해 과함 |
| D. JSON snapshot + 폴링 HTML | ❌ 기각 | watcher + HTML 두 곳 동기화 — 단일 점 위반 |

## 3. Windows 호환성

| 환경 | 동작 | 비고 |
|---|---|---|
| Windows Terminal / PowerShell 7 / VS Code 통합 터미널 | ✅ 정상 | ANSI·이모지·화면 클리어 OK |
| 레거시 `cmd.exe` (Win10 1909 이전) | ⚠️ 깨짐 | ANSI raw 문자, 이모지 `??` |
| Git Bash (MinGW) | ⚠️ 부분 | ANSI OK, 이모지 폰트 의존 |

- `fs.watch` 는 Windows 에서 텍스트 에디터 원자적 rename 저장 시 `rename` 이벤트로 fire — 핸들러에서 `change`/`rename` 둘 다 처리 필요.
- `--ascii` 플래그(이모지 → ASCII 배지 `[OK]`/`[..]`/`[==]`) 포함 여부는 Stage 1 확인 항목.

## 4. 하네스 동작 영향 분석

**토큰 소모: 0** — 대시보드는 Claude Code 세션 밖, 별도 사용자 프로세스. tool 호출·컨텍스트에 끼어들지 않음.

**지연: 무시 가능** — 이벤트 기반 watcher(200ms debounce), 디스크 I/O 무시 수준, idle CPU ~0%.

**격리 원칙 (강제)** — 다음 경로는 명시적으로 금지:
- 대시보드의 ledger 쓰기 (읽기 전용)
- SessionStart/Stop/PreToolUse 등 hook 연결 (컨텍스트 오염 방지)
- `harness-start` 가 대시보드를 자동 spawn (사용자 명시 실행만)
- ledger 파일 lock (OS atomicity 신뢰)

**간접 긍정 효과** — Loop Budget 소진 조기 가시화 → 무의미한 auto-fix 루프 조기 정지 → 총 토큰 절감.

## 5. 표시 항목 MVP 후보 (요약 모드 기본)

1. 활성 feature 1줄: `name (tier) | Phase X 🟡 | branch`
2. Loop Budget 소진율: `3/5` 형식, 임계 도달 시 강조
3. 최근 60분 advisory 태그 카운트: `[pre-grep] 2  [verify-tag] 0  ...`
4. 직전 커밋 1줄: `<sha7> <subject> (<relative-time>)`

활성 feature ≥3 시 자동 요약 모드, `--detail` 플래그로 확장.

## 6. Non-negotiable 충족 검토

- ✅ Aggregate-only — 카운트/상태만, 원문 키 입력·좌표 없음
- ✅ Privacy scrubber — 신규 데이터 수집 0, ledger 본인이 이미 스크럽됨
- ✅ Lifecycle cleanup — Ctrl+C 단일 종료점에서 watcher 해제
- ✅ Persisted schema 변경 0 — 새 파일 생성·기존 파일 수정 없음 (대시보드는 stdout 만)
- ✅ Loop budget — N/A (모니터, 자동 수정 없음)

## 7. Stage 1 진입 시 확인 필요 항목

1. `--ascii` 플래그 MVP 포함 여부 (레거시 cmd 사용자 지원 필요한지)
2. `harness-monitor-dashboard` 정적 생성기와 파싱 로직 공유 범위 (lib 추출 vs 완전 독립)
3. MVP 표시 항목 5번 §5 후보 4종 그대로 vs 추가/제거
4. 갱신 디바운스 값 (200ms 기본 vs 다른 값)
5. tier 분류 — Low/Medium/High 중 어느 것? (영향 파일 추정 ≥3 → Medium 후보)

## 8. 자율 결정 (§3 공통 의사결정 기준 적용)

| # | 결정 | 사유 |
|---|---|---|
| 1 | 별개 신규 피처 (`harness-monitor-dashboard` 와 분리) | 사용자가 새 이름·새 브랜치 명시 |
| 2 | 갱신 주기 = `fs.watch` + 200ms debounce | 이벤트 기반이 폴링보다 효율적 (편의·유용성 우선) |
| 3 | MVP 표시 항목 작게 시작 (§5 의 4종) | 비크리티컬 — 추가 항목은 사용 후 확장 |
| 4 | 활성 feature 자동 요약 모드 | UI 직관성 우선 — 한 화면 가독성 |
