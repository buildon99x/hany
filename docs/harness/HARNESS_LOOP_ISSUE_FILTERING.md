---
role: behavior
portability: project-specific
---

# Harness Loop — GitHub Issue 조회 기준

> 참조: `.claude/commands/harness-loop.md` §1-3 / §2-1 / §2-3
> 도입: harness-git-issue-loop (PR #249)

`/harness-loop` 가 한 사이클에서 어느 이슈를 픽업할지 결정하는 규칙을 정리한다. **OPEN + `harness:*` 라벨 + 제외 라벨 0개 + 3원 분류 2/3 일치** 의 4중 필터 구조.

---

## 1. 조회 단계

GitHub Issue 는 두 시점에서 조회된다.

### 1.1 Producer §1-3 — 발행 dedup 체크

```
search_issues(label:harness:*, perPage≤20, cursor pagination)
```

- **목적**: 새로운 follow-up 을 이슈로 발행하기 직전, 동일 항목이 이미 발행됐는지 검사.
- **확인 방법**: 각 이슈 본문 frontmatter 의 `source-hash` 필드 추출 후 비교.
- **해시 기준**: `sha1(file_path + line_offset + normalized_text[:200])`. 동일 해시 발견 시 발행 skip.
- **구현 참조**: `tests/harness-loop/lib/dedup.mjs` `computeHash()`.

### 1.2 Dispatcher §2-1 — 작업 대상 픽업

```
list_issues(state=OPEN, labels=harness:*, perPage≤20, cursor pagination)
```

- **목적**: 사이클이 처리할 이슈 큐 로드.
- 본문 크기 > 1000자 인 경우 §2-2 에서 `issue_read` 로 개별 조회 (목록 응답 truncation 회피).

---

## 2. 제외 필터 (Dispatcher §2-1)

§1.2 의 후보 이슈 중 아래 조건 **하나라도** 해당하면 skip.

| # | 조건 | 사유 |
|---|---|---|
| 1 | bot author | 사람 또는 harness 가 만든 이슈만 처리 |
| 2 | `harness:exclude` | 명시적 제외 (drift, report 등) |
| 3 | `harness:report` | Reporter 가 생성한 기술 리포트 — 재진입 방지 |
| 4 | `harness:loop-active` | 다른 사이클에서 lock 중 (C9 동시성 1) |
| 5 | `harness:needs-human` | 사람 검토 필요 — 자율 처리 불가 |
| 6 | `harness:cost-cap-hit` | 비용 캡 초과로 정지된 사이클 |
| 7 | `harness:pause` | 운영자 일시 정지 |

---

## 3. 3원 분류 게이트 (Dispatcher §2-3)

§2 필터를 통과한 이슈는 **3가지 분류 신호 중 2개 이상 일치** 해야 진행.

| 신호 | 형식 | 예시 |
|---|---|---|
| 1차 — 라벨 | `harness:<카테고리>` | `harness:stage-0`, `harness:stage-1`, `harness:stage-2`, `harness:harness`, `harness:frontend`, `harness:report` |
| 2차 — frontmatter | 본문 `tier:` 필드 | `tier: Low \| Medium \| High` |
| 3차 — 제목 prefix | `[<카테고리>]` | `[harness]`, `[stage-N]`, `[frontend]` |

**2/3 미충족** → `harness:needs-human` 라벨 추가 후 큐의 다음 이슈로.

분류 신호가 충돌하면 라벨 > frontmatter > 제목 순서로 우선시한다.

---

## 4. 처리 우선순위 정책

명시적 정렬 규칙은 없다. GitHub `list_issues` 의 기본 정렬(생성/업데이트 시각 역순)을 따른다.

- **1 사이클 = 1 이슈** (C9 동시성 1). 큐의 첫 매치만 처리.
- 우선순위 조정이 필요하면 라벨/타이틀로 명시 (운영자 작업).

향후 정렬 정책 확장 후보:
- `harness:Low|Medium|High` tier 가중치
- `created_at` 오름차순 (오래된 이슈 먼저)

---

## 5. 실제 예시

| 이슈 | 라벨 | 결과 |
|---|---|---|
| #222 [hot-fix] gallery 메모리 | (라벨 없음) | **skip** — `harness:*` 라벨 부재로 §2-1 미통과 |
| #250 [harness] LRU re-observe | `harness:backlog`, `harness:Low` | **pickup** — 라벨 + `[harness]` prefix + frontmatter `tier:Low` (3/3) |
| #251 [harness] blob cache | `harness:backlog`, `harness:Low` | **pickup** 가능 (3/3) |
| #252 [harness] Windows RAM | `harness:backlog`, `harness:Low` | **pickup** 가능. 단 본문 `autonomous: false` 이므로 Worker §3-1 에서 stage 산출까지만 수행 (구현 진입 차단) |

---

## 6. 알려진 함정

### 6.1 Stuck cycle — `harness:loop-active` 누수

Reporter §6-6 가 사이클 종료 시 `harness:loop-active` 라벨을 제거하지 않으면 해당 이슈는 모든 후속 사이클에서 영구 lock. 이게 stuck cycle 의 주요 원인.

**완화책**: 운영자가 stuck 의심 시 다음을 확인:
```
list_issues(labels=harness:loop-active, state=OPEN)
```
다른 사이클 없이 24시간 이상 `loop-active` 보유 이슈는 사람이 라벨 제거.

### 6.2 frontmatter 누락

본문에 `tier:` 필드가 없으면 2차 분류 신호 실패. 라벨 + 제목 prefix 둘 다 있어야 통과.  
`.github/ISSUE_TEMPLATE/harness-task.yml` 폼이 frontmatter 를 강제하므로 GitHub UI 로 만든 이슈는 안전. **수동 작성 이슈** 가 위험.

### 6.3 cross-cutting 키워드

Producer §1-4 에서 `i18n|security|migration|cargo|cross-cutting` 키워드 포함 follow-up 은 발행 거부 + `needs-human`. 즉, **자율 처리 자격 자체가 박탈** 되어 큐에 진입하지 않는다.

---

## 7. Producer 발행 거부 조건 (§1-4) — 큐 진입 차단

이슈가 큐에 들어오기 전에 Producer 단에서 거르는 조건도 별도로 존재한다:

| 조건 | 처리 |
|---|---|
| Acceptance Criteria ≥2 구성 불가 (텍스트 짧음·모호) | 발행 거부 |
| cross-cutting 키워드 포함 | `needs-human` 라벨로 발행 |
| Producer §1-5 sanitization 5종 위반 — fenced injection 감지 | `needs-human` 추가 |
| URL allowlist 위반 | URL `[REDACTED]` 치환 후 발행 |

---

## 8. `/harness-import` 진입로 (수동 promotion)

`/harness-loop` Producer §1-1 grep 경로 외에 수동 진입로로 `/harness-import <issue-number>` 가 추가됐다. 일반 GitHub 이슈(harness:* 라벨 없는 이슈) 를 1회 호출로 Harness Task 형식 신규 이슈로 변환·발행한다.

| 항목 | Producer §1 | `/harness-import` |
|---|---|---|
| 진입 | retro/lesson grep 자동 | 사용자가 이슈 번호 명시 |
| 대상 | follow-up 라인 | 임의 GitHub 이슈 1건 |
| MCP 호출 | search_issues + issue_write × N | issue_read + issue_write + add_issue_comment (3회 고정) |
| 토큰 비용 | 사이클당 10–15K | 3.5–5.5K (dry-run 2.5–4.5K) |
| dedup | source-hash sha1 | `imported-from: #N` 멱등성 검증 (CC-7) |
| 추론 | retro 텍스트 분석 | 1-pass infer.mjs (tier/category/featName) |

발행 결과는 동일 형식이므로 §2 Dispatcher / §3 Worker 의 분기는 두 경로 모두에 동일하게 적용된다. 자세한 명세는 `.claude/commands/harness-import.md` 참조.

## 9. 참조

- 슬래시 커맨드 (자율 사이클): `.claude/commands/harness-loop.md`
- 슬래시 커맨드 (수동 promotion): `.claude/commands/harness-import.md`
- Dedup 구현: `tests/harness-loop/lib/dedup.mjs`
- Sanitization 구현: `tests/harness-loop/lib/sanitize.mjs`
- 추론 구현: `tests/harness-loop/lib/infer.mjs`
- 본문 빌더: `tests/harness-loop/lib/issue-body-builder.mjs`
- Config: `harness-loop.config.json` (`label_prefix`, `sanitization_rules`)
- Stage 1 명세 (자율 사이클): `docs/feat_harness-git-issue-loop_s1.md` §3 (Producer/Dispatcher)
- Stage 1 명세 (수동 promotion): `docs/feat_harness-import_s1.md`
