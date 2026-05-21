---
name: harness-entry
description: Zone Membrane entry point for Harness Execution Zone. Validates s1+s2 readiness, initializes or resumes the Decision Ledger, and orchestrates Phase execution. Use when starting or resuming harness execution for a feature.
---

# Harness Entry

Activated by `/harness-start {feat-name}` or when harness execution needs to begin or resume.

## Path Conventions

- Decision Ledger: `docs/spec/{feat-name}_harness_ledger.md` (runtime artifact; created on first `/harness-start`, bundled into Phase commits, never separately committed).
- Retrospective: `docs/spec/{feat-name}_harness_retrospective.md` (post-orchestration artifact; written after all Phases reach ✅ 완료, bundled with the last Phase commit).
- Both files live under `docs/` so they are git-tracked alongside the feature s1/s2 documents.

## Readiness Validation

Before any Phase execution, verify:

1. `docs/spec/{feat-name}_s1.md` exists and contains a `Context Carry` section with **≥2 decision entries** (s1 Q6 — aligned with the rule and Quality Oracle minimum).
2. `docs/spec/{feat-name}_s2.md` exists and all Phase blocks contain the 6 required fields: 전제조건 / 인수조건 / 루프예산 / 롤백 / 서브에이전트 스코프 / 에스컬레이트 조건.
3. For Medium+ tier features: ATK section present in s1 with the obligatory answers (Medium = 인접 불변·이전 실패 의무 2 + 비명시 제약·MVP 경계 권장 2; High = 4 전체 의무). Answers in the form '해당 없음 + 이유' count as complete; bare '해당 없음' without a stated reason counts as missing.
4. **(advisory — design-stage SKILL §6 Footnote 2)** s1 §영향 파일 표에 `file:line` 인용 컬럼이 채워져 있는지 grep. 정규식: `` `[^`]+:(\d+|new|multi|extern[^`]*)` ``. 누락 시 ledger Decision Log에 `[s1-grep-trigger]` 태그 기록 후 진행(차단 아님 — 30일 advisory).
5. **(advisory — design-stage SKILL §6 Footnote 2)** s2 각 Phase Contract 인수조건 줄에 `[verify:]` 태그가 있는지 grep. 정규식: `\[verify: [a-z+]+(?:\+[a-z]+)*\]`. 누락 시 `[verify-tag-trigger]` 태그 기록 후 진행.
6. **(advisory — design-stage SKILL §6 Footnote 4)** s1 §영향 파일 표에 `grep -rl` 실행 결과 인용 흔적이 있는지 확인 (`pre-grep`, `grep -rl`, `grep -r` 키워드). 누락 시 `[pre-grep-trigger]` ledger Decision Log 기록 후 진행 (차단 아님 — 30일 advisory).
7. **(advisory — design-stage SKILL §6 Footnote 4)** s2 각 Phase Contract 서브에이전트 스코프 첫 줄에 `mode: subagent` 또는 `mode: main-batch` prefix 가 있는지 grep. 누락 시 `[delegation-mode-trigger]` ledger Decision Log 기록 후 진행 (차단 아님 — 30일 advisory). **Footnote 5 G3 발효 시 superseded** — 아래 item 8로 대체.
8. **(advisory — design-stage SKILL §6 Footnote 5 — subagent-dispatch-tuning 제안 2, 신규 feature만)** s2 각 Phase Contract 서브에이전트 스코프에 3신규 필드가 있는지 grep. 정규식: (a) `mode: (main|subagent:T[123])` (b) trigger 매칭 근거 1~2줄 (c) Hard Constraint 통과 증거 4항. 누락 시 `[subagent-dispatch-trigger]` ledger Decision Log 기록 후 진행 (차단 아님 — 기존 ledger grandfathered).

If any check 1~3 fails, report the specific missing item and stop. Items 4·5·6·7·8 are advisory: record trigger tag in Decision Log and proceed.

## Ledger Initialize / Resume

- If `docs/spec/{feat-name}_harness_ledger.md` does not exist → create it from `docs/harness/HARNESS_LEDGER_TEMPLATE.md`, populating Phase Status rows from s2 Phase blocks (all 🔲 미시작) and keeping the empty Effort Ledger `<!-- effort:auto:begin --> … <!-- effort:auto:end -->` sentinel region intact for later auto-append. Other tables (Decision / Escalation / Scope Discovery / Loop Budget) start empty.
- If Ledger exists → read current Phase Status table. Resume from the first Phase that is not ✅ 완료.

## Orchestration Loop

For each Phase (in order, starting from first incomplete):

1. Load the Phase Contract from s2 (전제조건 / 인수조건 / 루프예산 / 롤백 / 서브에이전트 스코프 / 에스컬레이트 조건).
2. Check 전제조건: if not satisfied, record in Escalation Log and ask user.
3. Execute Phase with sub-agent; pass:
   - Phase Contract fields
   - Referenced s1 sections (from 서브에이전트 스코프 field)
   - Current Ledger state (Decision Log + Scope Discovery Log)
   - **(advisory — design-stage SKILL §6 Footnote 3)** general-purpose 위임 시 A2 Self-verify footer 부착 의무 + E1 위임 완료 직후 ledger `## Subagent Invocations` 1행 기입 + Privacy scrub 룰. 누락 시 trigger 태그 3종 (`[subagent-verify-trigger]` / `[subagent-metrics-trigger]` / `[subagent-privacy-trigger]`) Decision Log 기록 후 진행 (차단 아님 — 30일 advisory).
   - **(advisory — design-stage SKILL §6 Footnote 5 — subagent-dispatch-tuning 제안 3)** sub-agent 위임 시 A1 Task Prompt 4섹션 (Role / Authority / Inputs / Output) 의무. 산출 직후 A3 통합 검토 단계 (권한 범위 / 컨텍스트 제약 / 일관성 3항 확인 + ledger Decision Log 1줄 기록). 누락 시 trigger 태그 2종 (`[subagent-authority-trigger]` / `[subagent-review-trigger]`) Decision Log 기록 후 진행 (차단 아님 — 30일 advisory).
4. After Phase completion:
   - Verify all 인수조건 are met.
   - Update Ledger Phase Status to ✅ 완료 with commit hash.
   - Bundle Ledger update into Phase commit (no separate Ledger commit).
5. If 루프예산 exceeded before 인수조건 met → stop, record in Escalation Log, ask user.

After the final Phase reaches ✅ 완료, prompt the operator to write `docs/spec/{feat-name}_harness_retrospective.md` from `docs/harness/HARNESS_RETROSPECTIVE_TEMPLATE.md` and bundle it with the last Phase commit (Playbook Step 7).

## Scope Discovery Protocol

When a new dependency is discovered during Phase execution:

- Compare with Context Carry 기각 사유 in s1 §4.
  - **Match found** (discovered constraint aligns with a documented rejection reason) → autonomous decision, record in Scope Discovery Log.
  - **No match / ambiguous** → record in Escalation Log + ask user before continuing.

## Escalation Resume Protocol

After user provides an answer to an escalation:

1. Record user answer in Ledger Decision Log (Phase, 결정, 이유).
2. Update Escalation Log entry with resolution status.
3. Resume the blocked Phase from the point it was paused.
4. Works across session boundaries: on session resume, read Ledger to restore escalation state.
