---
role: behavior
portability: portable
---

# Harness Operating Playbook

Use this playbook for every feature or harness change. It turns the plan into a repeatable workflow.

> Vocabulary and axis distinctions (gate cadence vs. rollout phase vs. tier): `docs/harness/GLOSSARY.md`.

## 0. Harness Entry (Medium+ 피처)

Medium+ 피처는 구현 단계 진입 전 `/harness-start {feat-name}` 을 실행한다.

- `docs/spec/{feat-name}_s1.md` + `_s2.md` 존재 및 Readiness Validation 통과 확인 (`.claude/skills/harness-entry/SKILL.md` 참조).
- Validation 실패 시 누락 항목을 해소한 뒤 재실행. 통과 전까지 Phase 실행 불가.
- Low 티어는 Step 0 생략, Step 1로 바로 진입.

## 1. Classify
- Assign difficulty tier using `docs/harness/FEATURE_DIFFICULTY_TIERS.md`.
- Record tier and rationale in `docs/harness/QUALITY_GATE_MATRIX.md` and `docs/harness/FEATURE_QUALITY_NOTE_TEMPLATE.md`.
- Escalate immediately if the work touches privacy-sensitive data, background lifecycle, persisted schema, permissions, or cross-layer contracts.

## 2. Scope Evidence
- Fill the short or full `docs/harness/QUALITY_GATE_MATRIX.md`.
- Decide which gates are PR-blocking, nightly, weekly, or release-blocking.
- Add `docs/harness/DATA_INVENTORY_TEMPLATE.md` if any data is collected, stored, displayed, exported, uploaded, logged, or retained.
- Link an ADR when the work changes architecture, privacy policy, schema, gate policy, or Claude Code hooks.
- Review `docs/harness/ADDITIONAL_REVIEW_PERSPECTIVES.md` when the work touches persistence, migration, recovery, desktop environment behavior, security boundary, or release operations.

## 3. Design the User Experience
- Review `docs/harness/UX_PRIVACY_DESIGN_GUIDE.md`.
- Complete the relevant parts of `docs/harness/FEATURE_REVIEW_CHECKLIST.md`.
- Include permission, empty, disabled, error, loading, success, and resume states when the feature is user-facing.
- Make privacy visible in calm language without claiming more than the implementation proves.
- Define degraded, retry, pause, and restart states when the feature can fail after background work has already started.

## 4. Implement with Guardrails
- Keep a `docs/harness/WORK_STATUS_TEMPLATE.md` snapshot for long-running work.
- Track loop budget when tests fail repeatedly.
- Add lifecycle cleanup tests when timers, listeners, workers, subscriptions, or caches change.
- Keep long-running soak validation in CI/Nightly/Weekly rather than local hooks.
- **Effort Ledger 자동 append (Medium+ 신규 ledger)**: Phase 커밋 시 Effort Ledger sentinel 영역에 active turn time + 5분할 토큰 행을 추가 — Phase 커밋과 같은 커밋에 번들 (단독 ledger 커밋 금지). 자동: PreToolUse(Bash) hook. 수동 fallback: `npm run harness:effort -- --ledger {path} --phase {key} --branch {branch}`. 임계 마킹은 Phase 단위가 아닌 Step 7 retrospective 책임 (분모 Σ 확정 후 일괄).

## 5. Verify
- Run focused tests for acceptance cases.
- Run privacy scrubber for touched artifacts.
- Run contract tests when payloads, schemas, or storage formats change.
- Run E2E smoke for user-facing flow changes.
- Add migration, rollback, or interrupted-write evidence when persisted data changes.
- Add known-failing or negative samples for new harness gates so the gate's failure path is proven.
- Ensure failure artifacts include a repro command, key metrics, and next action.

## 6. Handoff
- Complete `docs/harness/FEATURE_QUALITY_NOTE_TEMPLATE.md`.
- Link evidence paths from `docs/harness/QUALITY_GATE_MATRIX.md`.
- List deferred nightly/weekly/release-blocking evidence explicitly.
- State remaining risks and rollback or mitigation.
- `npm run lint:css` 위반 0 (CSS 변경 시 — advisory 단계에서도 핸드오프 전 확인).

## 7. Retrospective (Medium+ 피처)
- Harness Phase 전체 완료 후 `docs/spec/{feat-name}_harness_retrospective.md` 를 `docs/harness/HARNESS_RETROSPECTIVE_TEMPLATE.md` 기반으로 작성.
- 기록 내용: 즉흥 결정 목록 / 누락된 ATK 항목 / Phase Contract 공백 / 루프예산 사용량 / 인수조건 충족도 / Scope Discovery 충돌 / **Effort 분석 (Effort Ledger 마킹 대상 Phase 의 요인 카테고리 6종 + follow-up)** / 다음 s1 템플릿 개선 제안.
- Retrospective 파일을 Decision Ledger 최종 커밋과 함께 번들.
- Low 티어는 Step 7 생략.

## Review Response Protocol

PR 리뷰 코멘트, CI 실패, 사용자 피드백, Scope Discovery 모두 동일 절차로 처리한다 (s1 §3.5).

1. 피드백 수신 → 카테고리 분류: Logic error / Style / Architecture / Performance / Unclassified.
2. Decision Ledger 의 Decision Log 또는 Escalation Log 에 기록(아래 표 참조).
3. 영향받는 Phase 식별 → 해당 Phase 의 인수조건 재검증.
4. 후속 조치 결정: 동일 Phase 내 수정 / 후속 Phase 신설 / 사용자 에스컬레이션.

| 카테고리 | 정의 | 응답 전략 | Ledger 기록 |
| --- | --- | --- | --- |
| Logic error | 동작이 명백히 잘못됨 | 즉시 수정 | Decision Log |
| Style | 포맷·명명·코드 스타일 | 수정 | 불필요 |
| Architecture | 구조·추상화·계층 경계 | Phase Contract 인수조건 재검토 후 수정 | Decision Log |
| Performance | 성능 예산 초과 우려 | 측정 후 결정 | Decision Log |
| Unclassified | 위 카테고리로 분류 불가 | **사용자 에스컬레이션 필수** | Escalation Log |

## Scope Discovery 처리 절차

Phase 실행 중 새 의존성·제약·요구사항이 발견되면:

1. 발견 즉시 자동 진행 중단. Decision Ledger 의 Scope Discovery Log 에 (발견 항목·발견 Phase·일치 여부 후보) 기록.
2. Context Carry 기각 사유와 비교:
   - **일치(`Match`)** — 기각 사유와 정합 → 자율 결정. Scope Discovery Log 에 처리 결과 기록 후 진행 재개.
   - **불일치 또는 모호(`No match / ambiguous`)** — Escalation Log 기록 + 사용자 답변 대기. 답변 수신 전까지 Phase 진행 금지.
3. 발견이 인수조건 변경을 수반하면 Phase Contract 갱신 후 재검증. 인수조건이 변경된 사실을 Phase 커밋 본문에 명시.
4. 신규 Phase 가 필요하면 s2 의 Phase 시퀀스를 확장(번호 증가)하고 전제조건 사슬을 갱신.

## Follow-up 컨벤션 (harness-git-issue-loop)

Retrospective / Ledger / Lesson 파일에서 후속 작업을 표기할 때 아래 prefix 를 사용한다.

```
[ ] follow-up: <후속 작업 설명>
```

- **형식**: 줄 시작에 `[ ] follow-up:` (대소문자 구분 없음, 선행 공백 허용).
- **용도**: harness-git-issue-loop Producer 가 이 패턴을 grep 해 GitHub 이슈를 자동 발행함.
- **적용 시점**: 이 컨벤션 도입 이후 신규 작성분부터 적용. 기존 retro/lesson 소급 변환 불필요.
- **중복 방지**: Producer 가 `sha1(file_path + line_offset + text[:200])` 해시로 dedup — 동일 항목은 재발행되지 않음.
- **닫힌 follow-up**: 이슈 완료 후 해당 줄을 `[x] follow-up:` 으로 표시하면 Producer 가 skip.

## Stop Conditions
Stop and ask for user direction when:
- A privacy exception is needed.
- The difficulty tier must be raised to High.
- A migration, public API, or persisted schema change is required.
- The same failure has reached the auto-fix or rerun budget.
- Long-running validation is needed and expected runtime is material.
- The next step would require destructive changes or broad refactoring.
- A gate cannot explain whether the failure is product behavior, harness drift, or environment variance.
- Scope Discovery found a dependency that does not match any Context Carry rejection reason — record in Escalation Log and ask user before continuing.

## Subagent Delegation (advisory — design-rule.md §6 Footnote 3)
general-purpose 위임 시 A2 Self-verify footer + E1 ledger `## Subagent Invocations` 1행 기입 + Privacy scrub 룰 적용. 세부는 `.claude-context/design-rule.md` §5.4 참조. 30일 advisory · 차단 아님 · trigger 태그 3종 (`[subagent-verify-trigger]` / `[subagent-metrics-trigger]` / `[subagent-privacy-trigger]`) 으로 발동 카운트.

## Delegation Efficiency (advisory — design-rule.md §6 Footnote 4)
s1 §영향 파일 표 작성 전 `grep -rl '<대상 패턴>'` 실행 → 결과 인용 권장 (`[pre-grep-trigger]`). s2 Phase Contract 서브에이전트 스코프 첫 줄에 `mode: subagent` / `mode: main-batch` 명시 권장 (`[delegation-mode-trigger]`). Medium+ 적용 · Low 면제 · 30일 advisory · 차단 아님.

## Done Definition
A task is done when the applicable tier evidence exists, privacy scrubber passes, unresolved risks are named, and the next owner can understand the result from the Feature Quality Note without reconstructing the work from chat history.
