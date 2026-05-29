---
kind: feat
name: harness-real-time-dashboard
stage: 2
status: complete
---

# Harness Real-Time Dashboard — Stage 2 구현 계획

> 이전 Stage 문서: `docs/spec/harness-real-time-dashboard_s1.md` (3183a5f)
> Footnote 5 (subagent-dispatch-tuning) 발효 후 신규 작성 — 새 G3 3 신규 필드 양식 적용.

## 0. Footnote 5 호환 메모

- s1 §7 의 "영향 파일 4개 = §5.4 위임 임계 충족" 인용은 §5.4 위임 임계 **OR 4중 → 단일 임계 (≥50K char)** 완화로 무효. s1 은 grandfathered 이므로 재작성 불요, 본 s2 에서 정정 메모만.
- 본 s2 자체 추정 ~10K char < 50K → **메인 직접 Write** (`/stage-end 2` 시 서브에이전트 위임 안 함).
- Phase A·B 모두 새 G3 3 신규 필드 양식 적용 (advisory, placeholder 발효이나 dogfooding).

## 1. UI / UX 모형

```
┌─ harness-watch · claude/harness-realtime-dashboard-YhCMf · 14:32:05 ───────┐
│ Active features (1)                                                        │
│ ▸ harness-real-time-dashboard (Medium) | Phase A 🟡 | 2m ago               │
│                                                                            │
│ Loop Budget                                                                │
│   Phase A: 1/3                                                             │
│                                                                            │
│ Advisory triggers (last 60min)                                             │
│   [pre-grep] 1  [delegation-mode] 0  [verify-tag] 2  [subagent-verify] 0   │
│                                                                            │
│ Last commit                                                                │
│   6f1ad82 Merge remote-tracking branch ... (5m ago)                        │
└────────────────────────────────────────────────────────────────────────────┘
 [q]uit  [d]etail  [a]scii  [?]help
```

- 색상: 정상=white, 임계=yellow(33), 에러=red(31), 완료=green(32).
- ASCII 모드: 색·이모지 제거, `[..]`/`[OK]`/`[XX]` 배지로 대체.
- 박스: 유니코드 `─│┌┐└┘▸` / ASCII 모드 `-|+>`.

## 2. Phase 분할 (≥2)

**Phase A — 정상 기능 (단독 verifiable)**
- `scripts/lib/ledger-parser.mjs` 신규 — frontmatter + Phase Status + Loop Budget + Decision Log + Subagent Invocations 5섹션 파서, 단위 함수 export.
- `scripts/harness-watch.mjs` 신규 — argv 파싱 (`--once`/`--limit`/`--ascii`/`--no-ascii`/`--help`), 자동 감지 (`NO_COLOR`/`TERM=dumb`/`!isTTY`), fs.watch + 5s polling 폴백, 단일 `cleanup()`, 키 입력, 렌더.
- `package.json` 수정 — `"engines": { "node": ">=18.17" }` + `"scripts.harness:watch": "node scripts/harness-watch.mjs"`.
- pre-commit hook 가 `docs/architecture.md` 자동 갱신.

**Phase B — 검증·통합 (Phase A 완료 후)**
- `docs/harness/README.md` inventory 표 1줄 추가 (정확한 줄은 Phase B 시작 시 Read 로 확정).
- `tests/harness-watch/` 신규 — vitest snapshot (`--once` 평문, NO_COLOR ASCII, 빈 ledger 상태, fixture 기반).
- s1 §11 #7 사전 검증 — 실제 ledger 1건에서 Decision Log advisory 태그 ISO8601 시각 추출 가능성 확인 → 불가 시 "since start" 폴백 활성화.

## 3. Phase Contract — Phase A

**전제조건**:
- s1 §4 영향 파일 표 행 1·2·3 확정.
- `scripts/lib/scrubber.mjs:1` ESM export 패턴 + `scripts/generate-harness-dashboard.mjs` ledger 파싱 패턴 참조 (Assumption Verifier 입력).
- Node.js ≥ 18.17 환경.

**인수조건 ([verify:] 태그 9종 권장)**:
1. **[verify: grep]** `grep -n '"harness:watch"' package.json` == 1
2. **[verify: grep]** `grep -n '"engines"' package.json` == 1 (`>=18.17` 포함)
3. **[verify: runtime-deferred]** `node scripts/harness-watch.mjs --once` exit 0, stdout 비어있지 않음
4. **[verify: runtime-deferred]** `node scripts/harness-watch.mjs --help` exit 0, 단축키·플래그 안내 포함
5. **[verify: hooks:test]** `npm run hooks:test` 통과
6. **[verify: manual]** active feature 1+ 상태에서 인터랙티브 실행 시 5섹션 행 모두 표시
7. **[verify: 복합]** Ctrl+C 후 `stty -a` echo 복구 (raw mode 누수 없음)

**Phase A 단독 verifiable** ✅ — `--once` 모드로 머지 시점 빌드·테스트 통과.

**루프 예산**: 3회 (Medium 기본값)

**롤백**: `git revert` Phase A 단일 커밋 → 신규 2파일 + package.json 원복.

**서브에이전트 스코프 (G3 3 신규 필드)**:
- **mode**: `main`
- **trigger 매칭 근거**: N/A — T1 (대규모 read-only) ✗ / T2 (3+ 독립 모듈, 인터페이스 메인 확정) ✗ — `harness-watch.mjs` 가 `ledger-parser.mjs` import 의존 / T3 (노이즈 큰 검증) ✗.
- **Hard Constraint 통과 증거** (4항):
  - ⓐ 설계 결정 입력 없음: ✓ — s1·s2 명세대로 구현만, 추가 결정 여지 최소
  - ⓑ 상호 의존 다중 파일 수정 아님: ✗ — `harness-watch.mjs` ↔ `ledger-parser.mjs` import 의존 + `package.json` 동시 수정
  - ⓒ 디버깅·원인 추적 아님: ✓
  - ⓓ 5턴 초과 아님: ✓ — 단일 Phase 내 완결 가능
- → Hard Constraint ⓑ 위반 → **`mode: main` 강제**.
- 파일 목록: `scripts/harness-watch.mjs` (new) · `scripts/lib/ledger-parser.mjs` (new) · `package.json:9-14` (edit).
- 참조할 s1 섹션: §3 데이터 흐름 · §4 영향 파일 표 · §5 Context Carry · §8 엣지케이스.
- 제외: `docs/**` 일체 (Phase B 범위).

**에스컬레이트 조건** (Medium 표준):
- 루프 예산 3회 소진
- 동일 인수조건 2회 연속 실패
- 사용자 의도와 spec 불일치 발견
- privacy/lifecycle non-negotiable 위반 우려
- Windows fs.watch 동작 미확인 시점에서 머지 결정 필요

## 4. Phase Contract — Phase B

**전제조건**:
- Phase A 머지 완료, `npm run harness:watch --once` 정상 동작.
- 실제 ledger 1건 (`docs/spec/harness-real-time-dashboard_harness_ledger.md`) 존재 — `/harness-start` 시 생성됨.
- `docs/harness/README.md` inventory 표 위치 Phase B 시작 시 Read 로 확정.

**인수조건 ([verify:] 태그)**:
1. **[verify: grep]** `grep -n 'harness:watch' docs/harness/README.md` ≥ 1
2. **[verify: vitest]** `npx vitest run tests/harness-watch` 통과 (snapshot ≥3건: 빈 ledger / active 1건 / ASCII)
3. **[verify: runtime-deferred]** `NO_COLOR=1 node scripts/harness-watch.mjs --once | grep -P '\x1b\[' | wc -l` == 0
4. **[verify: runtime-deferred]** `node scripts/harness-watch.mjs --once | cat` exit 0, EPIPE 없음
5. **[verify: manual]** Decision Log advisory 태그 ISO8601 시각 추출 가능성 검증 → ledger Decision Log 1행 기록
6. **[verify: tsc]** `npx tsc --noEmit` 통과 (회귀 확인용, mjs 영향 없음)

**루프 예산**: 3회

**롤백**: Phase B 단일 커밋 `git revert` → README 1줄·테스트 파일 원복. Phase A 기능 유지.

**서브에이전트 스코프 (G3 3 신규 필드)**:
- **mode**: `main`
- **trigger 매칭 근거**: N/A — T1 ✗ / T2 ✗ (단일 모듈, 3+ 미만) / T3 ✗ (vitest 출력 결정적 snapshot, 노이즈 낮음).
- **Hard Constraint 통과 증거** (4항):
  - ⓐ 설계 결정 입력 없음: ✓ — 테스트·README 1줄, 결정 여지 최소
  - ⓑ 상호 의존 다중 파일 수정 아님: ✓ — 테스트 파일·fixture 독립, README 1줄
  - ⓒ 디버깅·원인 추적 아님: ✓
  - ⓓ 5턴 초과 아님: ✓
- → 4항 모두 통과하나 trigger 매칭 부재 → **`mode: main` 강제**.
- 파일 목록: `docs/harness/README.md` (edit, 1줄) · `tests/harness-watch/*.test.mjs` (new) · `tests/harness-watch/__fixtures__/*.md` (new, 스크럽 ledger 샘플).
- 참조할 s1 섹션: §1 컨셉 · §2 표시 모델 · §6 ATK MVP 경계 · §10 보안·프라이버시.
- 제외: `scripts/**` (Phase A 완료 후 동결).

**에스컬레이트 조건**: Phase A 와 동일 표준 + Decision Log 시각 추출 불가능 판정 시 spec 재검토.

## 5. 테스트 체크리스트

**자동 (Phase A)**:
- [ ] `--once` 모드 평문 출력 — exit 0
- [ ] `--help` 출력 — 단축키·플래그 안내
- [ ] argv 파싱 — `--limit=3`, `--ascii`, `--no-ascii` 조합
- [ ] `npm run hooks:test` 회귀

**자동 (Phase B, vitest snapshot)**:
- [ ] 빈 ledger 디렉터리 → "No active features" 출력
- [ ] active feature 1건 fixture → 5섹션 행 표시
- [ ] `NO_COLOR=1` → ANSI escape 0건
- [ ] non-TTY (파이프) → 자동 `--once` 동등 출력
- [ ] ledger frontmatter `status: archived` → 필터링 (미표시)
- [ ] retrospective 존재 feature → 필터링 (미표시)

**수동 (Phase A 머지 전 1회)**:
- [ ] 인터랙티브 실행 → 5초간 관찰, idle CPU `top` 으로 ~0%
- [ ] Ctrl+C → 1초 내 종료, `stty -a` echo 정상
- [ ] 터미널 리사이즈 → 다음 재렌더 폭 반영
- [ ] `d` 키 토글 → detail 행 추가/원복
- [ ] `a` 키 → ASCII 모드 전환
- [ ] `q` 키 → 종료 (Ctrl+C 동일 cleanup)

**Windows 수동 (가능 시 권장 — 필수 아님)**:
- [ ] Windows Terminal 박스·이모지 정상
- [ ] 레거시 `cmd.exe` → 자동 ASCII (`TERM=dumb`)
- [ ] 에디터 원자적 저장 → `rename` 이벤트 트리거

## 6. 안전장치·롤백

- **격리 원칙 강제**: PR 리뷰 시 hook/SessionStart 통합 코드 발견 → 거부.
- **단일 종료점**: `cleanup()` 함수에 watcher·stdin·cursor 정리. SIGINT/SIGTERM/SIGBREAK 모두 라우팅.
- **격리된 두 커밋**: Phase A 단일 · Phase B 단일. `git revert <phase-sha>` 독립 롤백.
- **fs.watch 폴백**: EMFILE/ENOSPC 캐치 → 5s polling + 1줄 경고 ("⚠ watch unavailable, polling at 5s"). 폴백도 cleanup 가능해야 함.

## 7. 리스크·열린 이슈

| # | 리스크 | 완화책 |
|---|---|---|
| R1 | Decision Log advisory 태그 ISO8601 시각 부재 가능 | Phase A 진입 시 실제 ledger 1건 grep → 불가 시 "since start" 폴백 |
| R2 | Windows fs.watch `rename` 이벤트 검증 환경 부재 | `change`/`rename` 둘 다 핸들러 (방어적), Win 머신 확보 시 추가 검증 |
| R3 | `engines.node >=18.17` husky/lint-staged 호환 | Phase A 시작 시 `npm install --dry-run` 사전 확인 |
| R4 | 다중 동시 실행 시 OS 한도 압박 | 영향 무시 (의도적 실행), 명시 안 함 |
| R5 | TUI snapshot color 차이 flaky | snapshot 은 `--ascii` + `--once` 조합만 (결정적) |

## 8. 코드 공유 — Phase B 후속 검토

- `scripts/generate-harness-dashboard.mjs` 가 `scripts/lib/ledger-parser.mjs` 를 import 하도록 리팩토링 (DRY).
- 본 PR 범위 외 — 별도 후속 task 분리 (격리 원칙 유지).

## 9. 확인 필요 항목 (s2 종료 게이트)

사용자 합의 완료:
1. Phase 분할 A=구현 / B=README·테스트·검증 ✓
2. Phase A 인수조건 7건 ✓
3. Phase B 인수조건 6건 ✓
4. 루프 예산 3회 (Medium 기본값) ✓
5. 위임 방식 = **두 Phase 다 `mode: main`** (Footnote 5 적용, 사용자 옵션 1 선택) ✓
6. Windows 수동 테스트 = **권장 (Win 머신 확보 시)**, 필수 아님

## 10. Decision Ledger 시드 (`/harness-start` 가 초기화 시 사용)

- Phase Status: A 🔲 / B 🔲
- Loop Budget Tracker: A 0/3 · B 0/3
- Decision Log 시드:
  - §0 Footnote 5 호환 정정 메모 (s1 §7 OR 4중 → 단일 임계 ≥50K char)
  - §7 R1~R5
- Subagent Invocations: **비어있음** — 본 피처는 양 Phase 모두 `mode: main`, 위임 사용 안 함. `[subagent-authority-trigger]` · `[subagent-review-trigger]` · `[subagent-dispatch-trigger]` 모두 미발동 예상.
- 사전 grep 인용 (`[pre-grep-trigger]` 회피): s1 §4 `harness:watch` 0건 + Phase B 진입 시 `docs/harness/README.md` 위치 1건 추가 예정.

## 11. §5.2 종료 게이트 advisory item 3 — G3 완비 검증

- Phase A: mode (`main`) + trigger 매칭 근거 + Hard Constraint 통과 증거 4항 **모두 명시** ✓
- Phase B: mode (`main`) + trigger 매칭 근거 + Hard Constraint 통과 증거 4항 **모두 명시** ✓
- → `[subagent-dispatch-trigger]` 미발동.

## 12. Review Response Protocol

PR 리뷰 코멘트 · CI 실패 · 사용자 피드백 · Scope Discovery 모두 `docs/harness/HARNESS_OPERATING_PLAYBOOK.md §Review Response Protocol` 절차를 따른다.

**카테고리별 응답 전략 (본 피처 적용)**:

| 카테고리 | 본 피처에서의 예상 사례 | 응답 전략 | Ledger 기록 |
|---|---|---|---|
| Logic error | `fs.watch` 폴백 실패 / `cleanup()` 누수 / parse error | 즉시 수정 (해당 Phase 내) | Decision Log |
| Style | TUI 출력 포맷·ANSI escape 일관성 | 수정 | 불필요 |
| Architecture | hook/SessionStart 통합 제안 (격리 원칙 위반) | **격리 원칙 강제** — 거부 또는 사용자 에스컬레이션 | Decision Log |
| Performance | idle CPU > 0.5% · re-render 200ms 초과 · ledger 파싱 메모리 누수 | 측정 후 결정 (Phase A 인수조건 6번 재검증) | Decision Log |
| Unclassified | non-negotiable (privacy/lifecycle) 위반 의심 | **사용자 에스컬레이션 필수** | Escalation Log |

**Scope Discovery 적용 시 본 피처 주의사항**:
- ledger md 의 Decision Log 시각 형식이 예상과 다른 경우 → Match (s1 §6 비명시 제약 "ISO8601 미준수 → since start 폴백" 과 일치) → 자율 진행 + Scope Discovery Log 기록.
- Windows fs.watch 동작이 예상과 다른 경우 → No match → Escalation Log + 사용자 답변 대기.
- ledger frontmatter 스키마 변경 발견 시 → 영속 schema 변경 = non-negotiable, **즉시 중단 + 사용자 에스컬레이션**.

**Phase Contract 인수조건 재검증 트리거**:
- Architecture 카테고리 코멘트 발생 시 Phase A·B 인수조건 전수 재검토.
- Performance 카테고리 측정 결과 임계 초과 시 Phase A 인수조건 6번 (idle CPU) 갱신 + 본 s2 §10 R3 리스크 행 갱신.
