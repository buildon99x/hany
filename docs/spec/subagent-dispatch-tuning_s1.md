---
kind: feat
name: subagent-dispatch-tuning
stage: 1
status: active
---

# Sub-agent Dispatch 정책 조정 — Stage 1 Feature Specification

> stage-start / stage-end / harness-start 세 명령어의 sub-agent 위임 정책 조정안.
> 참고자료: `9cc1bd52-SKILL.md` (Sub-agent Dispatch Policy)
> Tier: **Medium** (정책 문서 다지점 변경, 기능 추가/제거 없음, 기존 메커니즘 영향 점진 도입으로 완화).

## § Context Carry

| 결정 | 기각 옵션 | 기각 사유 |
|---|---|---|
| **D1.** Sub-agent 위임 결정 시점은 stage-end의 s2 작성 시점에 박는다. | (원안) harness-start Readiness Validation item 7에서 게이트. | (a) 계획에 없던 즉흥 판단이 실행에 끼어듦. (b) ledger 재개·재실행마다 결과가 흔들림. (c) SKILL.md Hard Constraint "스펙 해석·구현 계획 수립" 정신과 충돌. |
| **D2.** 적용 우선순위는 1 → 3 → 2 (위험 낮은 것부터). | 3개 제안 동시 적용. | 제안 2는 PHASE_TEMPLATE 양식 변경으로 기존 기능 영향이 -/↓. advisory → 30일 dogfood → 차단 승격 점진 도입 필요. |
| **D3.** 제안 1의 위임 임계는 "≥ 50K char"로 단순화하되 완전 폐지하지 않는다. | 완전 폐지 (메인 100% Write). | 거대 산출물 발생 시 메인 컨텍스트 보호 안전망이 필요. 기존 ledger 추적 메커니즘은 그대로 두어 발생 빈도만 감소시키는 게 안전. |
| **D4.** 제안 2의 신규 s2 양식은 **신규 feature부터만 차단**, 기존 진행 중 ledger는 grandfathered. | 모든 ledger에 일괄 적용. | 기존 s2.md 재작성 강제 시 진행 중 feature가 멈춤. design-rule §6 footnote의 grandfathered 패턴과 동일 정책. |

## § ATK 체크리스트 (Medium 의무 2 + 권장 2)

- **인접 불변조건 (의무)**: design-rule §5.4의 "위임 → ledger `## Subagent Invocations` 1행 기입 → 30일 advisory trigger 추적" 체인을 깨지 않는다. 제안 1·2 적용 후에도 trigger 태그 3종(`[subagent-verify-trigger]` / `[subagent-metrics-trigger]` / `[subagent-privacy-trigger]`)과 ledger 섹션은 그대로 유지 — 발생 빈도만 감소.
- **이전 실패 (의무)**: harness-improve-v1 등 기존 spec 작성 시 sub-agent 위임이 "단일 Write"였음에도 self-verify footer 누락으로 advisory trigger가 잡힌 사례 존재 → 제안 1이 이 패턴을 근본 제거. 또한 Phase 위임 시 메인이 모르는 결정이 코드에 박힌 잠재 사례를 제안 2·3이 사전 차단.
- **비명시 제약 (권장)**: PHASE_TEMPLATE 양식 변경이 외부 도구·hook 파싱에 영향 가능 → 검증 방법 2번(사전 grep)으로 사전 확인. `npm run hooks:test`로 hook 회귀 검증.
- **MVP 경계 (권장)**: 본 s1은 정책·문서 변경의 요구사항·영향 범위만 정의. Phase 분할·인수조건·롤백 절차는 후속 s2에서. 코드(hook 로직) 변경은 검증 2번 결과 영향이 발견된 경우에만 별도 범위.

## § 영향 파일 표

| 파일 | 전제조건 | 변경 방향 | 제안 |
|---|---|---|---|
| `.claude-context/design-rule.md` §5.4 | 현재 100줄/4임계 위임 강제 규칙 존재 (line 약 186 근방 § 위임 임계) | 100줄 임계 폐지, 위임 임계 "≥ 50K char" 단일로 단순화 | 1 |
| `.claude-context/design-rule.md` §4 (Stage 2 산출 양식) | Phase Contract 6필드 정의 (line 88) | "서브에이전트 스코프" 필드를 mode + trigger 매칭 근거 + Hard Constraint 통과 증거 3하위로 확장 | 2 |
| `.claude-context/design-rule.md` §5.2 (종료 게이트) | 종료 게이트 항목들 존재 | 위 3필드 완비 확인 추가 (신규 feature만 차단, 기존 grandfathered) | 2 |
| `.claude-context/design-rule.md` §6 Footnote 3 | A2/E1/Privacy scrub 3종 advisory (line 220 근방) | A1 Authority 명시 + A3 통합 검토 단계 신설 (추가만) | 3 |
| `docs/harness/PHASE_TEMPLATE.md` | Phase Contract 양식 정의 (전체) | "서브에이전트 스코프" 필드 형식을 design-rule §4 변경과 일치 | 2 |
| `docs/harness/SUBAGENT_DELEGATION_GUIDE.md` | "로직 변경 = sub-agent" 거친 분류 존재 | T1/T2/T3 + Hard Constraint 표로 교체 | 2 |
| `.claude/skills/harness-entry/SKILL.md` (Readiness Validation item 7) | 현재 `mode: subagent` prefix grep advisory (line 16~28 + 41~45) | 3필드 존재 grep으로 교체. 결정 로직 제거. 명백한 모순만 advisory trigger | 2 |
| `.claude/skills/harness-entry/SKILL.md` (Orchestration Loop step 3) | 각 Phase sub-agent 위임 기본 | 박힌 mode 그대로 실행 + 마지막에 "[REVIEW] 메인 검토 단계" 추가 | 2, 3 |
| `.claude/skills/design-stage/SKILL.md` | Stage 0/1/2 자연어 발동 규칙 | 동일 Task Prompt 4섹션 + 통합 검토 규약 명시 | 3 |

`grep -rl` 사전 실행 권장: `grep -rln '서브에이전트 스코프\|subagent-scope\|mode: subagent\|mode: main-batch' /home/user/hany --include='*.md' --include='*.mjs' --include='*.json'` — 결과는 s2 작성 시 §Scope 메모로 인용.

## § 인수조건 (s2 진입 조건)

s1 → s2 진입 시 다음 인수조건을 만족해야 한다. 모두 grep으로 검증 가능.

1. **사전 grep 인용 [verify: grep]**: 위 영향 파일 표의 9개 파일에 대해 `grep -rl` 사전 실행 결과가 s2 §Scope 메모에 인용된다.
   - 검증: `grep -c "grep -rl" /home/user/hany/docs/spec/subagent-dispatch-tuning_s2.md` ≥ 1
2. **Context Carry 결정 반영 [verify: grep]**: 본 s1 §Context Carry의 4개 결정(D1~D4)이 s2 Phase 분할에 반영되거나, 변경 시 s2 §Context Carry에 갱신 사유와 함께 추가된다.
   - 검증: `grep -cE "D[1-4]" /home/user/hany/docs/spec/subagent-dispatch-tuning_s2.md` = 4
3. **점진 도입 명시 [verify: grep]**: s2 Phase 중 제안 2 관련 Phase는 "advisory 도입 → 30일 dogfood → 차단 승격" 패턴이 인수조건/롤백 절차에 명시된다.
   - 검증: `grep -c "advisory\|grandfathered\|점진" /home/user/hany/docs/spec/subagent-dispatch-tuning_s2.md` ≥ 2
4. **호환성 사전 점검 [verify: hooks:test]**: s2 첫 Phase로 PHASE_TEMPLATE 파싱 hook 영향 사전 점검이 포함된다 (검증 방법 2번 참조).
   - 검증: `npm run hooks:test` 통과 + 영향 발견 시 hook 동시 갱신 Phase 추가.

## Context

업로드된 `9cc1bd52-SKILL.md` (Sub-agent Dispatch Policy)는 "메인 수행이 강한 기본값, sub-agent는 T1/T2/T3 3개 트리거에만 허용"이라는 원칙을 정한다. 현재 Pixel Horizon 운영 규칙은 정반대 방향이다:

- **design-rule.md §5.4** — Stage 1·2 산출물이 100줄 이상이거나 4가지 임계 중 하나 충족 시 general-purpose sub-agent에 **단일 Write 위임 강제**
- **harness-entry SKILL §Orchestration Loop** — 각 Phase를 sub-agent에 위임하는 것이 기본. `mode: subagent` / `mode: main-batch` prefix는 설계자가 자의적으로 선택 (advisory item 7)
- **SUBAGENT_DELEGATION_GUIDE.md** — 작업 유형별 권장 전략이 있으나 "로직 변경 = sub-agent" 식 거친 분류

이 갭이 실제로 손해를 만들어내는 지점만 골라 조정한다. 무차별 정책 교체가 아니라, **4가지 기준(결과 품질·토큰 비용·작업 시간·기존 기능 영향)에 종합적으로 양의 효과**가 명백한 변경만 채택한다.

---

## 제안 1. stage-end의 "단일 Write 위임" 폐지 (임계 대폭 상향)

**현재**: `design-rule.md §5.4` — 산출물 100줄 이상이면 general-purpose에 본문 통째 넘겨 Write만 시킴. self-verify footer + ledger `## Subagent Invocations` 1행 + privacy scrub 의무.

**갭**: SKILL.md Hard Constraint 3개에 동시 해당.
- "5턴 이내로 끝나는 작업" (단일 Write = 1턴)
- "방금 작성/수정한 코드의 검토·개선" (본문은 메인이 방금 만든 것)
- "메인이 이미 로드한 컨텍스트로 처리 가능"
- T1/T2/T3 어디에도 매칭되지 않음

**제안**:
- 100줄 임계 폐지. 메인이 직접 Write가 기본.
- 위임 임계를 "단일 호출 결과 ≥ 50K char" 한 가지로 단순화 (사실상 거대 산출물 보호용 안전망).
- self-verify footer / ledger 기입 / privacy scrub 의무도 위임이 실제 발생한 경우만 유지.
- `/compact` 호출은 그대로 (압축 효과는 sub-agent 위임이 아니라 `/compact`가 만든다).

**변경 대상**: `/home/user/hany/.claude-context/design-rule.md` §5.4 "기본 액션 — 저장·커밋·컨텍스트 압축" 섹션의 위임 임계 표/조건.

---

## 제안 2. Sub-agent 위임 결정을 stage-end의 s2 작성 시점에 박는다

**원래 안(harness-start 시점 게이트) 폐기 사유**: 결정 시점을 harness-start에 두면 (a) 계획에 없던 즉흥 판단이 실행에 끼어들고 (b) ledger 재개·재실행마다 결과가 흔들리며 (c) SKILL.md Hard Constraint "스펙 해석·구현 계획 수립" 정신과 충돌한다.

**현재**: `harness-entry SKILL.md` Readiness Validation item 7 (advisory) — Phase Contract의 서브에이전트 스코프 필드에 `mode: subagent` 또는 `mode: main-batch` prefix를 설계자가 자의적으로 선택. 누락 시 `[delegation-mode-trigger]` 태그 기록 후 진행.

**제안 — 결정 시점을 stage-end로 이동**:

s2 산출 양식의 Phase Contract "서브에이전트 스코프" 필드를 다음 3개 하위 필드로 확장하고, **stage-end 종료 게이트(§5.2)에서 완비 확인**.

- `mode` — `main` / `subagent:T1` / `subagent:T2` / `subagent:T3` 중 하나.
- `trigger 매칭 근거` — T1~T3 선택 시 어떤 조건으로 충족하는지 1~2줄. SKILL.md §Dispatch Triggers의 조건 그대로 인용. 못 채우면 `mode: main` 강제.
- `Hard Constraint 통과 증거` — 4항 체크: (a) 설계 결정/아키텍처/중간 결정 입력 없음 (b) 상호 의존 다중 파일 수정 아님 (c) 디버깅/원인 추적 아님 (d) 5턴 초과 작업 아님. 하나라도 미통과면 `mode: main` 강제.

**stage-end 종료 게이트**: 위 3필드 완비 확인 추가. 미완비면 저장 차단 (단, **신규 feature부터만 차단** — 기존 진행 중 ledger는 grandfathered, advisory만).

**harness-start의 역할 축소**: Readiness Validation item 7을 단순 `mode: subagent` prefix grep → 위 3필드 존재 grep으로 교체. 결정 로직은 넣지 않음. 명백한 모순만(예: Hard Constraint 위반 표시 + `subagent:*` 모드) advisory trigger 기록. 차단 아님.

**Orchestration Loop**: 박혀 있는 mode 값을 그대로 따름. 실행 중 매칭이 빗나간 게 드러나면 ledger Decision Log에 1줄 기록 후 메인 fallback. 차단 아님.

**책임 분리**:
- stage-end = 결정자 (계획 단계에서 trigger·Hard Constraint 평가)
- harness-start = 실행자 (박힌 값에 따라 단순 실행, 모순만 sanity check)

**변경 대상**:
- `/home/user/hany/.claude-context/design-rule.md` §4 (Stage 2 산출 양식) Phase Contract 정의 + §5.2 (종료 게이트) 완비 확인 항목 추가.
- `/home/user/hany/docs/harness/PHASE_TEMPLATE.md` "서브에이전트 스코프" 필드 형식.
- `/home/user/hany/.claude/skills/harness-entry/SKILL.md` Readiness Validation item 7 + Orchestration Loop step 3 (결정 로직 제거, 실행 위주).
- `/home/user/hany/docs/harness/SUBAGENT_DELEGATION_GUIDE.md` "로직 변경 = sub-agent" 거친 분류 제거 → T1/T2/T3 + Hard Constraint 표로 교체.

---

## 제안 3. 살아남은 sub-agent 위임 전부에 Task Prompt 4섹션 + 통합 검토 단계 의무화

**현재**: design-rule.md §6 Footnote 3에 advisory로 A2 Self-verify footer + E1 ledger 기입 + privacy scrub 3종이 있으나, SKILL.md가 강조하는 **Authority 명시**와 **통합 검토 단계**는 비어 있음.

**제안**: 제안 1·2 적용 이후 살아남은 모든 sub-agent 호출 — stage-start의 Impact Research / Codebase State Summary / Assumption Verifier, harness-start의 진짜 T1/T2/T3 매칭 Phase — 에 다음을 의무화.

- **Task prompt 형식 4섹션**: Role 1줄 / Authority (변경 가능 파일 목록 + 결정 권한 범위, "범위 밖 결정 금지" 명시) / Inputs / Output (형식·필수 항목·금지·길이 상한). SKILL.md §Task Prompt 템플릿 그대로.
- **통합 검토 단계**: sub-agent 산출 직후 메인이 (a) 권한 범위 벗어난 결정 (b) 메인 컨텍스트 제약 위반 (c) 다른 단계와의 일관성을 확인. ledger Decision Log에 검토 결과 1줄 기록.

**변경 대상**:
- `/home/user/hany/.claude-context/design-rule.md` §6 Footnote 3 옆에 A1 Authority 명시 + A3 통합 검토 단계 신설.
- `/home/user/hany/.claude/skills/harness-entry/SKILL.md` Orchestration Loop step 3 마지막에 "[REVIEW] 메인 검토 단계" 추가.
- `/home/user/hany/.claude/skills/design-stage/SKILL.md` Stage 0/1/2 자연어 발동 시 동일 규약 명시.

---

## 4기준 종합 검토

각 제안을 4기준에 매겨 net 효과를 평가. `↑↑`/`↑`/`-`/`↓`/`↓↓` 5단계. **기존 기능 영향** = 양수면 보존/개선, 음수면 훼손.

| 제안 | 결과물 품질 | 토큰 비용 | 작업 시간 | 기존 기능 영향 | net |
|---|---|---|---|---|---|
| 1. stage-end Write 위임 폐지 | ↑ | ↓↓ | ↓↓ | - (임계 ≥50K 안전망 유지, advisory trigger 추적 메커니즘은 그대로) | ++ |
| 2. s2 시점 trigger 매칭 박기 | ↑↑ | ↓ | ↓ | -/↓ (PHASE_TEMPLATE/s2 양식 변경, 기존 ledger는 grandfathered로 완화) | + |
| 3. Task Prompt 4섹션 + 통합 검토 | ↑↑ | 미세 ↑ | 미세 ↑ | + (기존 A2/E1/Privacy 항목 유지하며 추가만) | + |

### 기존 기능 악영향 점검 — 제안별 상세

**제안 1**:
- 영향 받는 메커니즘: design-rule §5.4 위임 절차, `## Subagent Invocations` ledger 섹션, 30일 advisory trigger 3종.
- 보존: 임계 ≥50K char 안전망 유지 → 거대 산출물 시엔 기존 메커니즘 그대로 작동. ledger 섹션·trigger 추적 코드는 손대지 않음 (발생 빈도만 감소).
- 훼손 없음.

**제안 2** (가장 신경 쓸 항목):
- 영향 받는 메커니즘: PHASE_TEMPLATE.md 6필드 구조, 기존에 이미 작성된 s2.md 파일들, harness-entry Readiness Validation item 7, Effort Ledger 자동 append.
- 보존:
  - **신규 feature부터만 차단**, 기존 진행 중 ledger는 grandfathered (advisory만). 기존 s2.md 재작성 강제하지 않음.
  - PHASE_TEMPLATE의 다른 5필드(전제조건/인수조건/루프예산/롤백/에스컬레이션) 그대로.
  - Effort Ledger sentinel append 메커니즘 그대로.
  - harness-entry item 1~6 그대로. item 7만 형식 변경.
- 훼손 가능: PHASE_TEMPLATE 양식 변경으로 외부 도구·hook이 6필드를 파싱 중이라면 영향. → 사전 확인 필요 (검증 2번).
- 완화: 점진 도입 — advisory로 시작해 30일 후 차단 승격.

**제안 3**:
- 영향 받는 메커니즘: design-rule §6 Footnote 3 advisory 규칙, harness-entry Orchestration Loop.
- 보존: A2 Self-verify footer / E1 ledger 기입 / Privacy scrub 그대로. **추가만** (A1 Authority + A3 통합 검토).
- 훼손 없음.

### 종합 — net 효과 큰 순서

1. **제안 1** — 가장 단순, 가장 명확. 4기준 모두 양수 또는 중립.
2. **제안 3** — 품질 ↑↑, 기존 기능 영향 + (추가만). 토큰·시간 미세 음수지만 무시 가능.
3. **제안 2** — 품질 ↑↑ (최대 이득)이나 기존 기능 영향이 -/↓ → 점진 도입 필수.

---

## 채택하지 않은 변경 (참고)

- `[MAIN]` / `[SUB:T1~T3]` / `[REVIEW]` 작업 계획 태깅 의무화 — 모든 plan 재작성 부담 대비 효과 미미.
- `[SUB:*]` 비율 절반 초과 시 자동 경고 — 자동 검증 수단 부재.
- 5턴 이내 자동 산정 — 사전 추정 불확실. 제안 2의 Hard Constraint 4항 체크로 대체 가능.

---

## 검증 방법

코드 변경이 아닌 정책 문서 변경이므로 동작 검증보다 **일관성·기존 기능 호환성 확인**에 초점.

1. **문서 일관성 grep**:
   - `design-rule.md`에서 "100줄" 임계가 위임 트리거로 남아있지 않음 확인.
   - `harness-entry/SKILL.md` item 7과 `PHASE_TEMPLATE.md` Phase Contract 필드 형식이 일치 확인.
   - `SUBAGENT_DELEGATION_GUIDE.md`의 "로직 변경 = sub-agent" 분류 제거 확인.
2. **PHASE_TEMPLATE 호환성 사전 확인**: `npm run hooks:test` 외에, PHASE_TEMPLATE 양식을 파싱하는 hook/스크립트가 있는지 `grep -rl "서브에이전트 스코프\|subagent-scope" scripts/ .claude/hooks/` 등으로 사전 점검. 영향 있으면 hook 동시 갱신.
3. **기존 진행 중 ledger 영향 확인**: `docs/spec/*_s2.md` 중 미완료/진행 중 항목 식별 → grandfathered 정책 적용 확인.
4. **dogfood 1회 (제안 1)**: 다음 Stage 1/2 산출물을 메인이 직접 Write하고 토큰/시간/advisory trigger 발생 수 비교.
5. **dogfood 1회 (제안 2)**: 신규 feature 1개에 새 s2 양식 적용 → harness-start 진입까지 끝까지 돌려 호환성 확인.
6. **`npm run hooks:test`**: hook 동작에 영향 없음 확인.

---

## 적용 우선순위 (구현 시 권장 순서)

1. **제안 1** (stage-end 위임 폐지) — 위험 최저, 효과 즉시. 먼저.
2. **제안 3** (Task Prompt 4섹션 + 통합 검토) — 추가만이므로 안전. 살아남은 위임의 품질 보장.
3. **제안 2** (s2 시점 trigger 매칭 박기) — 가장 큰 영향이지만 기존 기능 훼손 가능성도 가장 큼. PHASE_TEMPLATE 호환성 사전 확인(검증 2번) 후 advisory로 도입 → 30일 dogfood → 차단 승격.

**롤백 경로**: 각 변경은 독립적이므로 문제 발생 시 해당 제안만 되돌릴 수 있음. design-rule.md / PHASE_TEMPLATE.md / harness-entry SKILL.md 변경 직전 커밋을 베이스로 revert 가능.
