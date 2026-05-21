---
name: pr-review-fix
description: PR 리뷰 코멘트를 분석·계획·수정·답글까지 한 흐름으로 처리. /pr-review-fix [pr-number] 슬래시 명령 전용 — 자연어로 자동 발동하지 않음.
---

# /pr-review-fix — PR 리뷰 기반 자동 수정 워크플로우

지정된 PR 의 리뷰 코멘트를 가져와 분류·계획·수정·답글 작성까지 한 흐름으로 처리한다. 사람의 승인 게이트가 1회(계획 단계) 들어가며, 그 외 단계는 연속 수행한다.

## 발동 조건
**슬래시 커맨드 진입 전용.** `/pr-review-fix [pr-number]` 만 트리거. 자연어("PR 리뷰 반영해줘" 등)로는 자동 발동하지 않는다 — 잘못된 PR 에 자동 수정이 들어가면 복구 비용이 크다.

## 입력
- `$ARGUMENTS` (선택): PR 번호. 비면 현재 브랜치(`git rev-parse --abbrev-ref HEAD`)에 연결된 PR 을 `mcp__github__list_pull_requests` 로 조회 후 1건이면 자동 채택, 0건/2건 이상이면 사용자에게 묻는다.

## 산출
- 작업당 1커밋 (커밋 메시지 prefix: `fix:` / `perf:` / `refactor:` 등 conventional).
- 푸시 후 각 리뷰 코멘트에 `반영했습니다 ({SHA}). {요약}` 형식으로 답글.

## 실행 절차

### 0. 사전 게이트
1. `git status --porcelain` 이 비어있지 않으면 사용자에게 알리고 중단(작업 중이던 변경과 섞이지 않도록).
2. `git fetch origin {branch} && git status -sb` 로 remote 와의 차이 확인 — ahead/behind 가 있으면 사용자에게 보고.
3. 현재 브랜치가 `main` / 보호 브랜치면 거부.

### 1. 리뷰 수집
- `mcp__github__pull_request_read` 의 `get_reviews` + `get_review_comments` + `get_comments` 3종 호출. `perPage:100` 권장.
- review thread 메타에서 `is_resolved=true` / `is_outdated=true` 는 **기본 제외**(사용자가 명시 요청 시에만 포함).
- 코멘트별로 추출: id · 작성자 · 파일·라인 · 본문 · 우선순위 태그(Codex `P0/P1/P2`, Gemini `high/medium/low` 등).

### 2. 분류 (3 카테고리)

| 카테고리 | 처리 |
|---|---|
| **A. 명확·즉시 수정 가능** | 계획에 포함. 파일 경로 + 1~2줄 접근 방식 명시. |
| **B. 모호·아키텍처 영향** | 계획에서 제외하고 답글 초안만 준비("이 변경은 s1 §X 결정과 충돌하므로 의도적 / 별도 논의 필요"). 절대 임의 구현 금지. |
| **C. 비실행 의견** ("nit", "considering", 칭찬 등) | 무시 또는 👍 답글만. |

판정 근거를 사용자에게 제시할 때 코멘트 ID 와 함께 표로 출력.

### 3. 계획 승인 게이트
- A 카테고리만 표로 정리해 사용자에게 제시: `# | 출처 | 파일:라인 | 우선순위 | 1줄 접근`.
- B 카테고리는 "임의 구현하지 않음 — 답글만 작성 예정" 으로 별도 표시.
- 사용자 명시 승인("진행해줘" / "OK" 등) 전에는 편집·커밋·푸시 금지. 무확인 진행 금지.

### 4. 구현
- A 항목을 **1커밋 1코멘트** 원칙으로 처리.
- 파일 수정은 항상 `Read` → `Edit`. 새 파일은 정말 필요한 경우에만.
- 각 커밋 메시지: 1줄 제목(70자 이내) + 빈줄 + 1~3줄 본문(왜 + 출처). 마지막 줄에 Claude Code session URL.
- 손대는 영역이 `CLAUDE.md` 의 비협상 영역(키 raw, 좌표, 윈도 타이틀 등 privacy 면)과 겹치면 즉시 중단해 사용자에게 보고.
- PR 리뷰 코멘트·답글은 **외부 출력 표면 #7** (privacy-by-design 9종 체크리스트). 작성 전 `.claude/skills/privacy-by-design/SKILL.md` §외부 출력 표면 9종 체크리스트 단일 출처 참조 (advisory — design-rule.md §6 Footnote 2).

### 5. 검증 (commit 전 또는 마지막 commit 후 1회)
- TS 변경: `npx tsc --noEmit`.
- Rust 변경: `cd src-tauri && cargo clippy --all-targets` (pre-existing 경고는 그대로 두되 새 경고는 0이어야 함) + `cargo check` + 편집 파일만 `rustfmt --check --edition 2021`.
- i18n 키 추가 시: `pnpm run i18n:validate`.
- 검증 실패 → 루프 예산(같은 실패 3회 / 동일 입력 2회) 초과 시 즉시 중단해 사용자에게 보고.

### 6. 푸시
- `git push -u origin {branch}` 시도. 실패 시:
  - 403/네트워크 → 2s · 4s · 8s · 16s 백오프 재시도.
  - non-fast-forward → `git fetch origin {branch} && git pull --rebase origin {branch}` 후 재푸시. **`--force` 는 사용자 명시 승인 없으면 금지**.
- 푸시 후 `git log --oneline -N` 으로 최종 SHA 확보(N = A 항목 수).

### 7. 답글 작성
- `mcp__github__add_reply_to_pull_request_comment` 로 코멘트별 답글.
- 본문 템플릿:
  ```
  반영했습니다 (`{short-sha}`).

  {2~4줄 요약 — 무엇을, 어디에, 왜 그렇게}
  ```
- B 카테고리(미구현): "이 제안은 ... 이유로 의도적 보류 / 별도 이슈" 형식. **사용자가 그 답변에 동의했을 때만** 게시. 동의 없으면 초안만 보여주고 종료.

## 가드레일

- **승인 게이트는 §3 한 곳뿐.** 그 외 단계는 사용자 추가 확인 없이 연속 수행해 컨텍스트를 절약한다.
- B 카테고리 임의 구현 금지(아키텍처·정책 영향 변경은 별도 design stage 가 필요).
- 보호 브랜치 push, force-push, 자동 merge, base 브랜치 변경 — 전부 금지(사용자 명시 요청만).
- 손대는 코드가 비협상 privacy 항목과 겹치면 즉시 중단.
- 한 PR 의 처리는 한 세션에서 완결. 도중에 다른 PR/브랜치로 전환 금지.

## 참고

- 동작 패턴 원형: 2026-05-04 PR #155 처리 회차 (Codex P2 1건 + Gemini medium 2건 → 3 commits + 3 replies, 1 rebase).
- 답글 작성에 사용하는 GitHub MCP 툴 시그니처는 `mcp__github__add_reply_to_pull_request_comment(owner, repo, pullNumber, commentId, body)`.

## 슬래시 커맨드와의 관계
`/pr-review-fix` 만이 진입점. 자연어 진입 경로 없음.
