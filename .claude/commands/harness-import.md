---
description: 일반 GitHub 이슈를 Harness Task 형식으로 재발행하는 수동 promotion 경로
---

# /harness-import

`/harness-import <issue-number> [--dry-run] [--tier=Low|Medium|High] [--category=stage-0|stage-1|stage-2|harness|frontend]`

슬래시 1회 = 1 이슈 promotion. MCP 호출 4회 고정 (`issue_read get` + `issue_read get_comments` + `issue_write` + `add_issue_comment`).
토큰 비용 ~3.5–5.5K (dry-run ~2.5–4.5K) — `/harness-loop` 1 사이클의 약 1/3.

---

## §0 입력 검증

### 0-1. 인자 파싱
- `<issue-number>` 양의 정수. 누락/음수/비숫자 → abort.
- `--dry-run` (옵션) — `issue_write`/`add_issue_comment` 호출 없이 추론 결과 + 발행 미리보기만 출력.
- `--tier=<Low|Medium|High>` (옵션) — 추론 스킵, 명시 값 강제.
- `--category=<harness:stage-0|stage-1|stage-2|harness|frontend>` (옵션) — 추론 스킵.

### 0-2. 이슈 로드 (MCP 1회)
`mcp__github__issue_read({ method: 'get', issue_number: N })` — 실패 모드 §3.5 표.

### 0-2.5. Prior import 검출 (MCP 1회 — comments API, real-time)
`mcp__github__issue_read({ method: 'get_comments', issue_number: N })` → `findExistingImportComment(comments)` 호출.

검출 시 abort: `issue #N already imported as #M (per cross-link comment)`. comments API 는 GitHub Search 인덱싱 지연이 없어 직전 발행도 즉시 검출.

> Search-based dedup 은 ≤1분 신규 이슈에 대해 indexing 지연으로 false negative 발생 — `/harness-import 267` 재호출 시 발견. comments API 로 교체해 멱등성 보장.

### 0-3. 형식 검증
다음 중 하나라도 해당 시 abort:
- `state == 'closed'`
- `pull_request` 필드 보유 (PR 임)
- 본문에 harness frontmatter 검출 (`source-hash:` 라인 보유 — Producer §1-6 또는 prior `/harness-import` 산출)
- 본문에 `imported-from: #M` 검출 (CC-7 멱등성, /harness-import 발행물)
- `user.type === 'Bot'` 또는 `login` 이 `[bot]` 으로 끝남
- 본문에 `github.com/<other-owner>/<other-repo>` 외부 repo URL 검출 (C14 본 repo 한정)

abort 시 stderr 단일 라인 + 종료 코드 1.

> §0-3 `harness:*` 라벨 단독 검출은 abort 신호로 부적합 — 사용자가 triage 용으로 부착한 `harness:stage-0` 이나 Dispatcher 가 자동 부착한 `harness:needs-human` 도 함께 트리거되어 일반 promotion 차단. body frontmatter (`source-hash:` 또는 `imported-from:`) 가 "이미 변환됨" 의 정확한 신호.

---

## §1 1-pass 추론

`tests/harness-loop/lib/infer.mjs::analyzeIssue({ title, body, labels, user, issueNumber })`:

**Tier 가중** (--tier 미지정 시):
| 신호 | 가중 |
|---|---|
| `migration\|schema\|persistence` 키워드 | +3 |
| `src-tauri/src/**` 경로 | +2 |
| `IPC`/`new command`/`new state`/`invoke(`/`emit(`/`Mode ON\|OFF` · 한글 `신규/새/새로운` + `기능/옵션/모드/상태/명령/설정` | +1 |
| 파일 경로 ≥3개 | +1 |
| `CSS[- ]only`/`single rule/function/line`/`one[- ]liner` | -2 |
| body < 200자 (titleOnly 추가 -1) | -1 |

합 ≥3 → `High` · 1-2 → `Medium` · ≤0 → `Low`.

**Category 우선순위** (--category 미지정 시):
1. 라벨 `ux`/`design` 또는 경로 `src/styles/|src/ui/|src/pages/` → `harness:frontend`
2. 경로 `.claude/`/`docs/harness/`/`.github/` → `harness:harness`
3. body 에 `ideation`/`아이데이션`/`brainstorm`/`초안` → `harness:stage-0`
4. body 에 `docs/feat_*_s0.md` 참조 → `harness:stage-1`
5. 기본 → `harness:stage-0`

**feat-name** (CC-3 title-based):
prefix(`[tag]`/`fix:`/`feat:` 등) strip → 영문 단어 추출 → kebab-case → 30자. 빈 결과 시 `imported-<N>` fallback.

**Flags**:
- `crossCutting`: `i18n|security|migration|cargo|cross-cutting` 매치
- `fencedInjection`: fenced block 내 `rm -rf` / `curl|sh` / `eval(` / `subprocess.` / `os.system` 등 10종
- `needsHuman`: AC<2 OR files<1 OR crossCutting OR fencedInjection 중 하나라도 true

---

## §2 sanitization 5종

`tests/harness-loop/lib/sanitize.mjs::sanitizeIssueBody(body, config.sanitization_rules)` — HTML 주석 / zero-width / fenced injection 감지 / image alt 정제 / URL allowlist.

---

## §3 본문 빌드 + 발행

### 3-1. 빌드 (MCP 호출 없음)
`tests/harness-loop/lib/issue-body-builder.mjs::build({ originalIssueNumber, originalTitle, originalBody, inferResult, sanitizationRules })`.

**제목**: `[harness] <원본 title 60자 이내>`.
**라벨**: `[category, harness:<tier>]` + flags.needsHuman 시 `harness:needs-human` 추가.
**본문 (7필드 frontmatter + 3섹션, < 2K char)**:
```
feat-name: <kebab>
tier: <Low|Medium|High>
source-hash: <sha1("import:" + N + title)>
autonomous: false
imported-from: #<N>
acceptance-criteria:
  - <AC 1 or `<TBD>`>
  - <AC 2 or `<TBD>`>
predicted-files:
  - <path 1 or `<TBD>`>
---
## Origin
#<N>: <title>

## Excerpt
<sanitized 첫 단락 ≤200자>

## Inference
tier=<X> (weight=<n>) · category=<Y> · feat-name=<Z>
```

### 3-2. dry-run 분기
`--dry-run` 시: 위 title/labels/body 마크다운 출력 후 종료. MCP 미호출. **추정 토큰 라인 수 기반 표시** (`estimated tokens: ~<lines * 8>`).

### 3-3. 실 발행 (MCP 2회)
1. `mcp__github__issue_write({ method: 'create', title, body, labels })` — 실패 시 abort, 부분 산출물 없음.
2. `mcp__github__add_issue_comment({ issue_number: N, body: '본 이슈는 #<M> 로 재발행됨 (harness-import)' })` — 실패 시 CC-6: 신규 이슈에 cleanup 자가-코멘트 + stderr 경고 + 종료 코드 1. **신규 이슈 롤백 X**.

성공 시 stdout: `[harness-import] published #<M> (https://github.com/buildon99x/pixel-horizon/issues/<M>)`.

---

## §3.5 실패 모드

| 시점 | 실패 | 처리 |
|---|---|---|
| §0 `issue_read` 404 | abort `issue #N not found` |
| §0 `issue_read` 403 | abort `permission denied` |
| §0 `issue_read` 429 | abort + reset 시각 안내 |
| §0 `issue_read` timeout | 1회 재시도, 재실패 abort |
| §3 `issue_write` 실패 | abort, 부분 산출물 없음 |
| §3 `add_issue_comment` 실패 | CC-6 자가-cleanup, 신규 이슈 보존 |
| 모든 시점 Ctrl+C | 진행 단계까지 출력, §0 `imported-from:` 검증으로 재변환 방지 |

---

## §4 deny / 안전장치

- 본 repo (`buildon99x/pixel-horizon`) 한정 — 외부 repo URL §0-3 검증
- 재변환 방지 — `imported-from: #M` 검출 시 §0-3 abort (CC-7)
- 비크리티컬 추론 — 모호 시 `harness:needs-human` 부착 발행, abort X (CC-2)
- 원본 close 안 함 — 항상 open 유지 (CC-1)

---

## 예시
- `/harness-import 266` — 실 발행
- `/harness-import 266 --dry-run` — 미리보기만
- `/harness-import 266 --tier=High` — 추론 오버라이드
- `/harness-import 266 --category=harness:stage-1` — 카테고리 오버라이드
