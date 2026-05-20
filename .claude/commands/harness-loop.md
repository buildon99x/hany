---
description: GitHub Issue 큐 기반 자율 워크 사이클 — Producer → Dispatcher → Worker → Reviewer → Closer → Reporter
---

# /harness-loop

슬래시 1회 = 1 사이클 = 1 issue = 1 PR = main auto-merge (MVP).

> **전제조건 미충족 시 즉시 abort.** 아래 §0 사전 검증 참조.

---

## §0 사전 검증 (Startup Gate)

### 0-1. Config 로드

`harness-loop.config.json` 을 Read 로 로드한다.  
파일 부재 또는 JSON 파싱 오류 → abort, 사용자에게 config 생성 안내.  
`tests/harness-loop/run-all.mjs` 의 `validateConfig` 룰로 필수 필드 검증 → 위반 시 abort.

### 0-2. main branch protection 검증 (C18)

`autonomous_mode: true` 이고 GitHub MCP `list_branches` 결과 `main.protected === false` 이면 **abort 하지 않고 PR-only 모드**로 전환:

- 런타임 플래그 `auto_merge_allowed = false` 설정
- §5 Closer 의 머지 단계 스킵 → PR open 상태로 사이클 종료
- 사람이 직접 머지

```
WARN: main branch protection not active (C18).
PR 생성 후 사이클 종료 (PR-only 모드). 사람 머지 필요.
ADR 0008 References에 활성 일자 추가 후 auto-merge 활성 가능.
```

`auto_merge_allowed = (autonomous_mode && branchProtected && config.auto_merge_enabled)`

### 0-3. 동시성 1 사이클 검증 (C9)

`docs/feat_*_harness_ledger.md` 파일 중 Phase Status 가 `🔄 진행 중` 인 것이 존재하면 dispatcher 차단:

```
ABORT: 다른 harness 사이클 진행 중 (ledger: docs/feat_X_harness_ledger.md). 완료 후 재실행.
```

### 0-4. hook 활성 자가 검증 (S6)

`hook_validation_hashes` 가 설정된 경우 — 해당 hook 파일의 SHA1 을 계산해 저장값과 비교. 불일치 시 경고 (abort 하지 않음, 단 Escalation Log 기록).

---

## §1 Producer — follow-up 수집·발행

### 1-1. 소스 grep

`docs/` 디렉토리에서 다음 패턴을 grep 한다:

```
grep -rn "^\s*\[ \] follow-up:" docs/
```

대상 파일: `*_harness_retrospective.md`, `*_harness_ledger.md`, `docs/learn/lesson_*.md`.  
`[x] follow-up:` (체크됨) 은 skip.

### 1-2. dedup 해시 계산

각 매칭 행마다 `sha1(file_path + line_number + normalized_text[:200])` 를 계산한다.  
`tests/harness-loop/lib/dedup.mjs` 의 `computeHash` 로직 동일.

### 1-3. 기존 이슈 dedup 확인

GitHub MCP `search_issues` 로 `label:harness:*` 이슈 목록 조회 (`perPage ≤ 20`, cursor 페이지네이션).  
각 이슈 frontmatter 본문에서 `source-hash` 필드를 추출. 동일 해시 발견 시 skip.

### 1-4. 발행 거부 조건 (AC 미달 / cross-cutting)

다음 중 하나라도 해당하면 발행 거부:
- 수집된 텍스트로 Acceptance Criteria ≥2 구성 불가 (내용이 너무 짧거나 모호)
- 텍스트에 cross-cutting 키워드(i18n, security, migration, cargo, cross-cutting) 포함 → `needs-human` 라벨 부착 후 skip

### 1-5. 본문 sanitization 6종 (C15, C4 + 외부 출력 표면 #6)

이슈 본문에 삽입 전 반드시 sanitization 수행:
1. HTML 주석 strip
2. Zero-width chars strip
3. Fenced injection detection (감지 시 `needs-human` 추가)
4. Image alt-text 정제
5. URL allowlist 검증 (위반 URL → `[REDACTED]` 치환)
6. **Fallback issue body** — 본문 sanitize 결과가 빈 문자열이거나 모든 단계가 실패한 경우 `[content unavailable — see harness ledger]` 기본 본문으로 교체 (privacy-by-design 외부 출력 표면 #6, advisory — design-rule.md §6 Footnote 2)

### 1-6. 이슈 발행 (GitHub MCP `issue_write`)

```
제목: [harness] <follow-up 텍스트 요약 60자 이내>
라벨: harness:backlog, harness:<tier>
본문 (한국어, C7):
  feat-name: <kebab-case>
  tier: <Low|Medium|High>
  source-hash: <sha1>
  autonomous: false
  acceptance-criteria:
    - <AC 1>
    - <AC 2>
  predicted-files:
    - <예상 파일>
  ---
  <원문 follow-up 텍스트>
```

발행 직후 `actor=claude+<session-uuid>` 첫 코멘트 (A4).

---

## §2 Dispatcher — 이슈 분류·진입

### 2-1. 이슈 목록 조회

`list_issues state=OPEN labels=harness:*` cursor 페이지네이션 (`perPage ≤ 20`).

제외 필터:
- bot author
- `harness:exclude` / `harness:report` / `harness:loop-active` / `harness:needs-human` / `harness:cost-cap-hit` / `harness:pause` 라벨 보유

### 2-2. 이슈 본문 로드

list 응답 본문 크기 > 1000자이면 `issue_read` 로 개별 조회.

### 2-3. 3원 분류 검증 (C2/D12)

1차: 라벨 (`harness:stage-0/1/2/harness/frontend/report`)  
2차: 본문 frontmatter `tier` 필드  
3차: 제목 prefix (`[harness]`, `[stage-N]`, `[frontend]` 등)

2/3 항목이 일치 시 진행. 미달 시 `needs-human` 라벨 추가 후 다음 이슈로.

### 2-4. Dispatcher Lock 획득 (A1)

1. `issue_write` 로 `assignee = github-user` + `harness:loop-active` 라벨 추가.
2. 5초 후 `issue_read` 로 재확인.
3. assignee / 라벨이 다르면 (race) abort 이 이슈, 다음으로.

---

## §3 Worker — 구현

### 3-1. 자율 구현 신호 확인 (C13)

이슈에 `harness:auto-implement-ok` 라벨 또는 frontmatter `autonomous: true` 없으면  
→ Stage 산출 (`docs/feat_{feat-name}_s*.md`) 까지만 수행, 구현 진입 금지.

### 3-2. harness-entry Readiness Validation 코드 패턴 재구현

슬래시 호출 금지 (C11). 아래 조건을 직접 검증:
- `docs/feat_{feat-name}_s1.md` 존재 + Context Carry ≥2 결정
- `docs/feat_{feat-name}_s2.md` 존재 + 모든 Phase 6필드 완비
- Medium+ tier: ATK 의무 답변 (Medium = 2개, High = 4개)
- **(advisory — design-rule.md §6 Footnote 2)** s1 §영향 파일 표 `file:line` 인용 grep — 누락 시 `[s1-grep-trigger]` 태그 ledger 기록 후 진행 (차단 아님)
- **(advisory — design-rule.md §6 Footnote 2)** s2 Phase Contract 인수조건 줄 `[verify:]` 태그 grep — 누락 시 `[verify-tag-trigger]` 태그 ledger 기록 후 진행

> 본 항목 4·5 는 `.claude/skills/harness-entry/SKILL.md` §Readiness Validation 의 advisory 항목 4·5 와 **단일 출처** — 본문·정규식 수정 시 양측 동기화 의무 (D5).

검증 실패(항목 1~3) → abort + `needs-human` 라벨 (C21). 항목 4·5 advisory 는 차단하지 않음.

### 3-3. 이슈 종류별 분기

| 라벨 | 동작 |
|---|---|
| `harness:stage-0` | `docs/feat_{feat-name}_s0.md` Write (Stage 0 아이데이션) |
| `harness:stage-1` | `docs/feat_{feat-name}_s1.md` Write (Stage 1 스펙) |
| `harness:stage-2` | `docs/feat_{feat-name}_s2.md` Write (Stage 2 구현 계획) |
| `harness:harness` | Orchestration Loop 룰 코드 패턴 재구현, ledger commit 번들 |
| `harness:frontend` or frontend path 매치 | `frontend-design` 스킬 결과 통합 |

### 3-4. Scope Discovery Protocol (C20)

새 의존성 발견 시:
- s1 §7 Context Carry 기각 사유와 비교 → 일치 시 자율 결정 (Scope Discovery Log 기록)
- 불일치/모호 → Escalation Log + `needs-human` + 사용자 대기

### 3-5. 루프 예산 (s2 §3.3)

동일 실패 메시지 2회 → `needs-human`.  
자동 보완 ≤3 → 초과 시 `needs-human`.  
n-gram repeat 패턴 감지 → 즉시 정지.

### 3-6. 브랜치 생성

`create_branch`: `claude/{feat-name}-{slug}` (`branch_prefix` 설정 참조).  
커밋·PR 모두 이 브랜치에서.

---

## §4 Reviewer — 페르소나 분리 (D9)

### 4-1. 페르소나 자동 선택 (Q16, S2)

diff path 를 `persona_auto_select_path_patterns` 와 비교:
- frontend path 매치 → `frontend-design` + `ux-review`
- hooks/secrets/auth path → `privacy-by-design` + `pr-review-fix`
- rust path (`src-tauri/src/**`) → `desktop-resident-stability` + `feature-quality-gate`
- default → `feature-quality-gate` + `ux-review`
- 항상 `privacy-by-design` 1개 추가 (중복이면 이미 포함)

cross-cutting 매치 시 페르소나 ≥3 필수.

### 4-2. 리뷰 코멘트 작성

`pull_request_review_write` 로 각 페르소나 관점 코멘트 작성 (각각 다른 리뷰어 시점).  
Approve 권한 없음 — 코멘트만.

### 4-3. 리뷰 보완 루프

리뷰 코멘트 반영 후 재검토 ≤3회. 초과 시 `needs-human`.

---

## §5 Closer — auto-merge 6단계 게이트 (D3)

### 5-0. PR-only 모드 분기 (C18)

§0-2 에서 `auto_merge_allowed === false` 로 설정된 경우:
1. PR 본문에 `harness:auto-merge-pending` 라벨 추가 + 한국어 코멘트 (`auto-merge 비활성 — 사람 머지 대기. main branch protection 활성 후 자동화 재개 가능.`)
2. assignee 유지, `harness:loop-active` 라벨 제거
3. Reporter §6 단계는 머지 후 실행이므로 스킵
4. 사이클 종료

머지 대기 PR 누적 시 다음 사이클의 §0-3 (동시성 1) 검증에는 영향 없음 — ledger Phase Status 기준이지 PR 상태가 아님.

### 5-1. 자동 머지 6단계 게이트 (auto_merge_allowed === true 일 때만)

아래 6개 조건 모두 충족 시 `merge_pull_request` (squash merge).

| # | 조건 | 실패 시 |
|---|---|---|
| G1 | CI 그린: build.yml (tsc + i18n:validate) + cargo clippy + cargo fmt + hooks:test | `needs-human` |
| G2 | 페르소나 분리 충족 (작성 ≠ 리뷰, ≥2) | `needs-human` |
| G3 | cross-cutting 키워드 0 (i18n, security, migration, cargo, cross-cutting) | `needs-human` |
| G4 | deny_paths 변경 0 (`.claude/**`, `docs/harness/**`, `.github/**`, `.claude-context/**`) | `needs-human` |
| G5 | Loop budget 위반 흔적 0 (동일 에러 2회 이상) | `needs-human` |
| G6 | sanitization 5종 통과 (HTML/ZW/fenced/alt/URL) | abort + privacy 알림 |

rebase conflict → 즉시 `needs-human` (자율 rebase 금지).  
회귀 발견 → `harness:revert` 라벨 + 자동 revert PR 준비, 머지는 사람 (S11).

---

## §6 Reporter — 머지 후 (3.6)

### 6-1. 기술 리포트 이슈 발행

`issue_write` 로 기술 리포트 이슈 생성:
- 제목: `[report] {feat-name} 머지 완료 — {PR 번호}`
- 라벨: `harness:report` + `harness:exclude`
- 본문 (한국어): 변경 요약 + 인용 룰/ADR + 자율 결정 목록 + 회수된 부채 + 함정

### 6-2. user-story 변경 이슈 (조건부)

diff 에 frontend path 포함 + 리뷰에서 `user-visible: yes` 언급 시:
- 제목: `[report] {feat-name} 사용자 스토리 변경`
- 동일 라벨: `harness:report` + `harness:exclude`

### 6-3. cost-ledger append

환경 변수 설정 후 cost_ledger.mjs 트리거:
- `HARNESS_LOOP_CYCLE_ID`, `HARNESS_LOOP_ISSUE_NUMBER`, `HARNESS_LOOP_CYCLE_START_MS`

mtime 윈도우 합산 (C16, subagent 포함).  
`exceeded_cap: true` → `harness:cost-cap-hit` 라벨 추가 + 다음 사이클 정지.

### 6-4. Drift 점검

**트리거 조건** (D11/Q9): 사이클 N=5 또는 7일 중 먼저 도래.

Drift 점검 이슈 발행:
- 라벨: `harness:report` + `harness:exclude`
- 본문: 최근 머지 N건 요약 + drift 항목 목록

SLA 14일 무응답 → 자동 close + 다음 점검 이슈 발행 (C8).

### 6-5. Dashboard append

`HARNESS_LOOP_DASHBOARD.md` 에 1줄 append:

```
| {cycle_id} | #{issue} | {feat-name} | {started_at} | {elapsed_ms}ms | ${usd:.4f} | {status} |
```

주간 합산 표는 7사이클마다 갱신.

### 6-6. 사이클 종료 마커

`harness:loop-active` 라벨 제거 + assignee 해제.

---

## §7 에러 분류·운영 시나리오 (D12 / s0 §9 / s1 §6)

| 유형 | 처리 |
|---|---|
| flaky (1회) | 1회 재시도 |
| deterministic (동일 에러 ≥2) | `needs-human` |
| sanitization 위반 | abort + privacy 알림 |
| destructive | PreToolUse hook 자동 차단 |
| harness-entry 실패 | abort + `needs-human` (C21) |
| ambiguous Scope (CC 불일치) | Escalation Log + 사용자 대기 |
| cost cap 초과 | `harness:cost-cap-hit` + 다음 사이클 정지 |
| 세션 timeout | 이슈 frontmatter `resume-from` 커밋 해시로 재개 |
| harness:revert (회귀) | revert PR 준비, 머지는 사람 (S11) |
| drift SLA 14일 무응답 | 자동 close + 다음 점검 이슈 (C8) |

---

## §9 자기 참조 금지 (C5)

본 루프 가동 후 아래 경로는 **deny** (자율 변경 불가):
- `.claude/**`
- `docs/harness/**`
- `.github/**`
- `.claude-context/**`

예외: `docs/harness/HARNESS_LOOP_DASHBOARD.md` 는 Reporter 가 사이클당 1줄 append 만 허용.

---

## §10 Staged Mode (`--staged` 플래그)

`/harness-loop --staged` 는 단일 이슈를 **Stage 1 → Stage 2 → Implementation 3단계** 자율 진행한다. default 는 off — 기존 1-issue=1-PR 흐름 유지. Stage 0 은 사람 `/stage-start 0` 영역 (CC-19). 자세한 컨셉·CC·엣지케이스는 `docs/feat_harness-loop-staged_s1.md`.

### §10-1 Router 진입

`tests/harness-loop/lib/stage-orchestrator.mjs::routeIssue({ labels, body, files, featName })` 단일 진입점. 결정 표:

| 입력 신호 | 결정 |
|---|---|
| `harness:needs-human` 또는 `harness:blocked` 부착 | abort (E3) |
| `harness:stage-0` 단독 (또는 stage-0 + 상위 라벨 → CC-1 으로 stage-0 우선) | abort + 안내 (CC-19/E26) |
| `harness:stage-1` + `_s0.md` 또는 비-stage 디자인 노트 검출 | enter Stage 1 (CC-11 `sourceDesign` 기록) |
| `harness:stage-2` + `_s1.md` | enter Stage 2 |
| `harness:stage-2` + `_s1.md` 부재 + 디자인 노트 | demote → Stage 1 (CC-10/E16, 사용자 확인 필요) |
| `harness:stage-2` + 모든 산출물 부재 | abort + `needs-human` (CC-10/E17) |
| `harness:impl` + `_s2.md` | enter Implementation |
| 다중 stage 라벨 | 가장 낮은 stage 우선 (CC-1) |
| 라벨 없음 + 본문 `source-hash:` | Stage 1 강제 (E2) |

### §10-2 Stage 실행 흐름

| Stage | 작업 | 산출물 | review | sub-issue (stage 종료마다 1개) |
|---|---|---|---|---|
| 1 | Spec 작성 (Context Carry ≥2, ATK, 영향 파일 표 전제조건 열, **`file:line` 인용 컬럼 advisory**, **ATK 매핑표 5종 advisory** — §6 Footnote 2) | `docs/feat_*_s1.md` | Gemini `review_plan` 1차 + escalation (CC-3) | "Stage 1 완료 + review N회" |
| 2 | Plan 작성 (Phase Contract 6필드, Risk Register, **각 인수조건 `[verify:]` 9종 태그 advisory** — §6 Footnote 2) | `docs/feat_*_s2.md` | Gemini `review_plan` 1차 + escalation | "Stage 2 완료 + review N회" |
| Impl | Phase A~ 전체 자율 (CC-5/Q6 (b)) + tests + clippy/tsc | source 변경 + Phase 별 commit | tests/clippy/tsc (review 미적용) | "구현 완료 + PR #M" |

각 stage 작업은 sub-agent (general-purpose) 위임 — 메인 context = 회신 30줄 보존 (T-1).

**(advisory — design-rule.md §6 Footnote 3)** general-purpose 위임 시 A2 Self-verify footer + E1 ledger `## Subagent Invocations` 1행 기입 + Privacy scrub 룰 적용 (design-rule §5.4 참조). 누락 시 trigger 태그 3종 (`[subagent-verify-trigger]` / `[subagent-metrics-trigger]` / `[subagent-privacy-trigger]`) ledger Decision Log 기록 후 진행.

### §10-3 Branch / Commit

- **Branch 우선순위 (CC-12)**: `stage-orchestrator::pickBranch` — (1) 세션 지정 → (2) `claude/harness/<feat-name>` → (3) `main` 분기.
- **Commit prefix**: `docs(stage-1): ...` / `docs(stage-2): ...` / 구현은 conventional. Review 보완: `review(stage-N): ...` 별도 commit.
- **PR diff bloat gate (CC-13)**: PR 직전 `git log origin/main..HEAD --oneline | wc -l` > config `staged_mode.pr_diff_bloat_threshold` (default 5) → 사용자 확인 게이트 (`stage-orchestrator::isPrDiffBloated`).
- **Push 정책**: C18 retry 4회 (2/4/8/16s). main protection off → PR-only mode 재사용.

### §10-4 Sub-issue 발행 (Stage 종료마다 1개, CC-2)

- API: `mcp__github__sub_issue_write({ method: 'create', parent_issue_number, ... })` — Phase B `sub-issue-builder.mjs` 가 7-필드 frontmatter 빌드.
- Phase 종료는 sub-issue 본문에 한 줄 `mcp__github__issue_write update` append (사이클당 ≤ 4 sub-issue).
- **멱등성**: comments API 검출 — prior `(harness-loop-staged-sN)` 마커 → skip (E6).
- **Cross-link comment on parent**: `"Stage <N> 완료 → sub #<M> (harness-loop-staged)"`.

### §10-5 Review & refine

- **Escalation pattern (CC-3)**: 1차 Gemini `review_plan(path)` → "UX/UI 보강 필요" 신호 검출 (영향 파일에 `src/styles/` / `src/ui/` / `src/pages/` 또는 라벨 `ux`/`design`) → `frontend-design` + `ux-review` 스킬 추가 호출. `/review` 슬래시는 **사용자 명시 트리거 한정**.
- **Privacy gate (CC-6)**: 산출물 자격증명/원본 검출 시 review skip + 경고. **외부 출력 표면 9종 체크리스트**는 `.claude/skills/privacy-by-design/SKILL.md` §외부 출력 표면 9종 체크리스트 단일 출처 참조 (advisory — §6 Footnote 2).
- **Cache (N-1)**: `Map<sha256(file_content), result>` — 동일 hash 재호출 시 외부 전송 회피.
- **Loop budget**: 3회 (config `review_loop_budget`). 보완은 `review(stage-N):` commit 분리. 소진 시 `harness:needs-human` + abort.

### §10-6 라벨 책임 표 (요약 — 전체 표 s1 §8.5)

| 라벨 | Worker 진입 트리거 |
|---|---|
| `harness:stage-0` | **본 staged worker 진입 대상 아님 (CC-19)** |
| `harness:stage-1` | Stage 1 워크 |
| `harness:stage-2` | Stage 2 워크 |
| `harness:impl` | Implementation 워크 (Q6 (b)) |
| `harness:in-progress` + `harness:loop-active` | 양면 락 (CC-21) |
| `harness:cost-warning` | 40K 토큰 도달, 다음 Phase 진입 금지 |
| `harness:needs-human` / `harness:blocked` | 자동 사이클 차단 |
| `harness:done` | PR 머지 완료 |

### §10-7 봇 리뷰 silent skip (CC-15)

봇 리뷰 (Codex / Gemini / `[bot]` 접미사 작성자) 가 다음 중 하나 → silent skip + 별도 follow-up 미발행:

- deny_paths (§9 의 4종 — `.claude/**`, `docs/harness/**`, `.github/**`, `.claude-context/**`) 의 라인 지적
- 본 사이클 changeset 밖의 라인 지적

검출은 comments API 의 `path` 필드만 select (T-2 — body 회피).

### §10-8 Convergent fix (CC-16)

다중 신호 (봇 + CI) 가 같은 `file:line` 키로 매칭 → **두 곳 모두 close 되는 최소 변경 1회** 우선 적용. `review-loop.mjs` 의 hashmap O(N+M) 매칭.

### §10-9 2단계 Cap (s1 §15)

| Stage | Token cap | LOC cap |
|---|---|---|
| Stage 1 | 8,000 | — |
| Stage 2 | 8,000 | — |
| Impl Phase 각각 | 15,000 | 700 |
| 누적 (사이클 전체) | 50,000 | 2,000 |

- 40,000 (80%) → `harness:cost-warning` + 다음 Phase 진입 금지
- 50,000 (100%) → abort + `harness:blocked`

### §10-10 자동 재호출 금지 (CC-20)

`--staged` 사이클의 자동 재호출 (`/loop 15m` 등) 은 본 plan 범위 외. 사용자가 명시 트리거 한 경우에만 작동.

### §10-11 API 가용성 부재 시 정책 (QS2-3)

`mcp__github__sub_issue_write` 또는 `mcp__gemini-review__review_plan` 부재 시:
- 자율 fallback **금지**
- `mcp__github__issue_write create` 로 일반 GitHub 이슈 발행 (제목: `[harness-loop-staged] Phase <X> blocked — <api> unavailable`)
- 본 Phase abort + `harness:needs-human` + 원본 이슈에 cross-link comment
- 사용자 처리 위임

---

## §11 Idempotency (s1 §14 — staged mode 적용)

`--staged` 사이클의 모든 변경 작업은 다음 키로 멱등성을 확보한다. 동일 키가 이미 존재하면 작업을 skip 한다.

| 작업 | 멱등성 키 / 검증 |
|---|---|
| Stage 진입 | `harness:in-progress` + `harness:loop-active` 동시 부착 (CC-21 양면 락). 두 라벨 동시 존재 시 중복 진입 차단 |
| Sub-issue 발행 | parent comments API 검출 — `(harness-loop-staged-s<N>)` 마커 보유 시 skip (`sub-issue-builder::hasPriorSubIssueMarker`) |
| 라벨 전이 | ledger 의 `transition_log: [{ from, to, ts }]` 마지막 entry 와 일치 시 skip |
| Commit | branch HEAD commit message prefix + body hash 매치 시 skip (현재 작업이 이미 commit 된 상태) |
| PR 생성 | 같은 branch 의 open PR 검출 시 신규 생성 X, 기존 PR 본문 갱신 |
| Cost ledger append (CC-17) | `sha1(cycle_id + stage + ts)` 키 중복 시 skip — single-line append 만 deny_paths 예외 |

`idempotency_keys` config 항목 (`harness-loop.config.json::staged_mode.idempotency_keys`) 으로 노출 — 외부 도구가 키 목록을 참조 가능.

---

$ARGUMENTS
