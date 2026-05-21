---
kind: feat
name: harness-real-time-dashboard
stage: 1
status: complete
---

# Harness Real-Time Dashboard — Stage 1 기능 설계

> 이전 Stage 문서: `docs/spec/harness-real-time-dashboard_s0.md`
> 관련 선행: `docs/spec/harness-monitor-dashboard_s1.md` (정적 HTML 일회성 생성). 본 피처는 별개 신규, 렌더링 로직 공유는 Phase B 에서 검토.

## 1. 컨셉

`npm run harness:watch` 한 줄로 별도 터미널에서 ANSI TUI 실시간 모니터. `fs.watch` (200ms debounce) 로 `docs/spec/*_harness_ledger.md` 변경 감지 → 화면 재렌더. 외부 의존성 0, Node.js ≥ 18.17 내장만, Claude Code 세션 외부 격리 프로세스 (hook/skill/agent 연결 금지).

**핵심 정의**:
- **Active feature** = `_harness_ledger.md` frontmatter `status: active` AND 동일 feat 의 `_harness_retrospective.md` 미존재. 둘 다 만족하지 않으면 화면 미표시.
- **`--once` 모드** = 1회 렌더 후 평문 stdout + `exit 0`. non-TTY (파이프·리다이렉트) 환경에서 자동 활성화 → CI/snapshot 테스트 enable.

## 2. 표시 모델 (요약 모드 기본)

| 우선순위 | 행 | 내용 | 데이터 소스 |
|---|---|---|---|
| 1 (상단) | Header | `harness-watch · <branch> · <wallclock>` | `git rev-parse --abbrev-ref HEAD` |
| 2 | Active features | feature 별 1줄: `name (tier) | Phase X 🟡 | <updated-relative>` | ledger Phase Status + mtime, 정렬 = mtime 내림차순, 화면 초과 시 상위 5개 + `... +N more` (`--limit N` 조정) |
| 3 | Loop Budget | 각 활성 Phase 의 `n/N` 소진율, 임계 도달 시 ✱ 강조 | ledger Loop Budget Tracker |
| 4 (하단) | Advisory triggers (last 60min) | `[pre-grep] N  [delegation-mode] N  [verify-tag] N  [subagent-verify] N` | Decision Log grep + ISO8601 시각 (시각 추출 불가 시 "since start") |
| 5 (하단) | Last commit | `<sha7> <subject> (<relative-time>)` | `spawnSync('git log -1 ...')` |
| Footer (항상) | 단축키 | `[q]uit [d]etail [a]scii [?]help` | 상시 |

`d` 키 토글 → feature 별 최근 Decision Log 1줄 + Subagent Invocations 마지막 행 추가. **플래그는 없음** (런타임 키만).

## 3. 데이터 흐름

```
fs.watch('docs/spec/', { persistent: true }) [+ EMFILE/ENOSPC 폴백 → 5s polling]
  → debounce(200ms) → reparseAll()
  → parseLedgerMd() (frontmatter + Phase Status / Loop Budget / Decision Log / Subagent Invocations)
  → spawnSync('git log -1 ...') + spawnSync('git rev-parse ...')
  → renderToBuffer(state, { ascii, detail }) → ANSI clear + stdout.write
```

키 입력: `process.stdin.setRawMode(true)` (TTY 만), `--once` / non-TTY 모드는 setRawMode 생략.

## 4. 영향 파일 표

> 사전 grep (`grep -rln 'harness:watch|generate-harness-watch'`): 0건. 신규 파일만 추가.

| # | 파일 | 변경 요지 | 전제조건 | file:line |
|---|---|---|---|---|
| 1 | `scripts/harness-watch.mjs` | 신규 — TUI 메인 (watcher · 파싱 호출 · 렌더 · 키 입력 · `--once`/`--limit`/`--ascii`/`--no-ascii`/`--help` 파싱). 50줄 미만 렌더 함수는 내부 유지 | `docs/spec/` 존재, Node.js ≥ 18.17 | `new` |
| 2 | `scripts/lib/ledger-parser.mjs` | 신규 — ledger md 4섹션 + frontmatter 파서. Phase B 에서 `generate-harness-dashboard.mjs` import 검토 | scripts/lib/ ESM 패턴 (`scrubber.mjs:1`) | `new` |
| 3 | `package.json` | `"harness:watch": "node scripts/harness-watch.mjs"` 1줄 + `"engines": { "node": ">=18.17" }` 추가 (기존 없으면 신설) | line 13 `harness:dashboard` 다음 | `package.json:13` |
| 4 | `docs/harness/README.md` | inventory 표에 새 도구 1줄 추가. 정확한 줄은 s2 진입 전 1회 Read 로 확정 | 기존 inventory 표 형식 | `extern: (s2 확정)` |

## 5. Context Carry

| # | 결정 | 기각 옵션 | 기각 사유 |
|---|---|---|---|
| 1 | Tier = **Medium** | Low | `fs.watch` listener = lifecycle touch (TIERS §raise 조건) |
| 2 | 파싱 lib **분리** (`ledger-parser.mjs`) · 렌더는 메인 내부 함수 유지 | (a) 모두 inline (b) 렌더도 분리 | (a) Phase B 통합 비용↑ · (b) 50줄 미만 분리 비용 > 가치 |
| 3 | **자동 감지 우선** (`NO_COLOR` / `TERM=dumb` / `process.stdout.isTTY===false`) → ASCII 폴백. `--ascii`/`--no-ascii` 는 강제 override | `--ascii` 명시만 요구 | 사용자가 환경 변수만으로 자동 작동 (no-color.org 표준) |
| 4 | 갱신 = **fs.watch + 200ms debounce**, watch 실패 시 5s polling 자동 폴백 | (a) 1s polling (b) chokidar | idle CPU 0 + 외부 의존성 0 |
| 5 | **격리 원칙** — hook / SessionStart / agent / harness-start auto-spawn 금지, 사용자 명시 `npm run harness:watch` 만 | hook 통합 | 토큰 폭증 + lifecycle 단일 종료점 위반 |
| 6 | **단축키만 (런타임 토글)** + `--once`/`--limit`/`--ascii`/`--help` 시작 시 플래그 | `--detail` 플래그 병행 | 결정 트리 단순화 |

## 6. ATK 체크리스트 (Medium = 의무 2 + 권장 2)

| ATK | 답변 |
|---|---|
| **인접 불변조건 (의무)** | `scripts/lib/*.mjs` 4개 (scrubber/kpi/report-md/transcript-adapter) ESM export 패턴 일관. `package.json` scripts 형식 일관. `engines` 필드 추가 시 기존 husky/lint-staged 호환 확인. pre-commit hook 의 `docs/architecture.md` 자동 갱신 신뢰. |
| **이전 실패 (의무)** | scripts/lib bootstrap 의존성 누락 전례 → 신규 lib 는 Node.js 내장만. `harness-monitor-dashboard` ledger 의 동일 lesson 참조. TUI 자동 테스트 누락으로 회귀 못 잡는 패턴 → **`--once` 모드로 vitest snapshot 가능하게 설계**. |
| **비명시 제약 (권장)** | ledger 경로 = `docs/spec/*_harness_ledger.md` 고정. Decision Log 시각 형식 = ISO8601 가정 — 미준수 시 "since start" 폴백. `NO_COLOR` env 존중. `process.stdout.isTTY` 분기. |
| **MVP 경계 (권장)** | 표시 항목 §2 5행만. 자동 알림/이메일/webhook/CI 통합 없음. hook 연결 금지. 외부 폰트/CDN 없음. 색상 = ANSI 8색 + ASCII 폴백. scroll/paging 없음 (상위 N + `... +N more`). |

## 7. 작업 규모 추정 (단일 Slice 판정)

- 외부 IO 결과량 < 50K char, cross-cutting 키워드 0 매치 → **단일 Slice 가능** (s1 명시).
- 영향 파일 4개 = §5.4 위임 임계 충족 → s2 에서 ≥2 Phase 권장 (Phase A 정상 기능 / Phase B README 갱신 + ascii 자동 감지 검증 + `--once` snapshot 테스트).
- 단일 Phase 확정 시 plan 에 "Phase A 단독 verifiable" 명시 의무.

## 8. 엣지케이스 (13건)

- ledger 0건 → "No active features. Waiting for `docs/spec/*_harness_ledger.md` …" 빈 상태, watcher 유지 (exit 안 함).
- ledger Phase Status 표 비정형 → 해당 feature `parse error` 배지, 다른 feature 영향 없음.
- `git` 실패 → Last commit `n/a`, 다른 섹션 정상.
- 터미널 < 60col → 박스 생략, 텍스트 줄바꿈.
- SIGWINCH → 다음 재렌더에서 새 크기 반영.
- Ctrl+C / SIGTERM / SIGBREAK / 콘솔 닫힘 → 단일 `cleanup()` 함수 (watcher.close · stdin.setRawMode(false) · cursor show), exit 0.
- 에디터 원자적 rename 저장 → `change`/`rename` 둘 다 핸들러.
- **`NO_COLOR` / `TERM=dumb` env** → 시작 시 ASCII 자동 활성화.
- **non-TTY (`process.stdout.isTTY===false`)** → 자동 `--once` 모드 + 평문 출력 + exit 0.
- **stdout EPIPE** (`| head` 등) → SIGPIPE 캐치, graceful exit, no crash dump.
- **fs.watch 실패** (EMFILE/ENOSPC/inotify 한도) → 5s polling 자동 폴백 + 1줄 경고 표시.
- **ledger 파일 삭제** (`git checkout main` 등) → rename 이벤트 → reparseAll → 해당 feature 즉시 화면 제거.
- **feature ≥6개 / 시스템 시간 점프** → 상위 5 표시 + `... +N more`, `--limit` 조정. 시간 점프 시 "last 60min" 1회 부정확 — 다음 이벤트에서 자가 회복.

## 9. 마이그레이션·롤백

- 마이그레이션 없음 (신규 파일만, 영속 schema 0).
- 롤백: `git revert` 단일 커밋 → 신규 파일·package.json·README 행 원복.

## 10. 보안·프라이버시·라이프사이클

- **Aggregate-only**: 카운트/상태/sha7/시각만. Decision Log 본문은 detail 모드에서 1줄 요약만 (ledger 자체가 Footnote 3 스크럽됨).
- **Privacy scrubber**: 신규 데이터 수집 0 → 스크러버 추가 의무 없음.
- **Lifecycle cleanup**: 단일 `cleanup()` 에 watcher · stdin · cursor · 모든 시그널 라우팅.
- **Security boundary**: 새 hook/export/upload 없음. 읽기 전용 디스크 접근만. 외부 네트워크 0.
- **Loop budget**: 본 도구는 모니터 — 자동 수정 0, 대상 아님.

## 11. 확인 필요 항목 (사용자 합의 완료)

s0 §7 + 신규 검토 항목 8건 모두 s1 본문에 반영 완료 (사용자 "i 로" 선택 = 추천 안 일괄 채택).

1. Tier=**Medium** (§5 행1)
2. 파싱 lib **분리** + 렌더 메인 내부 (§5 행2)
3. **자동 감지 + override 플래그** (§5 행3, §8 NO_COLOR/dumb)
4. 표시 항목 §2 5행 그대로
5. ledger 0건 시 **빈 상태 화면 유지** (§8)
6. README.md **1줄만** 추가 (§4 행4)
7. Decision Log 시각 추출 → ISO8601 가정 + "since start" **폴백 채택** (§6 비명시 제약)
8. `package.json engines.node >=18.17` **추가** (§4 행3)

## 12. Subagent 스코프 (s2 진입 시 참고)

- Assumption Verifier 입력: 영향 파일 표 §4 의 전제조건 컬럼 + `package.json:13` 인용 + Decision Log 시각 형식 사전 grep 결과
- Harness Readiness Oracle: §5 Context Carry · §6 ATK · §7 단일 Slice 판정 · §8 13건 엣지케이스
