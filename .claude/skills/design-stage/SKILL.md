---
name: design-stage
description: Stage 기반 설계 워크플로우 (Stage 0 아이데이션 → 1 기능 설계 → 2 구현 계획). /stage-start · /stage-end 슬래시 명령 또는 한국어 자연어 트리거로 인보크. 산출물은 docs/spec/{name}_s{N}.md 에 저장.
---

# /design-stage — Staged Planning Workflow

> Claude Code 세션에서 기능 제안·설계를 다룰 때 따르는 단계적 워크플로우 규칙. 산출물은 `docs/spec/{feat-name}_s{N}.md`.
> **단일 소스** — 본 SKILL.md 가 절차 본문 + 자연어 트리거를 모두 보유. `.claude/commands/stage-start.md` / `.claude/commands/stage-end.md` 슬래시 커맨드와 `.claude/CLAUDE.md` 포인터는 본 파일을 참조하는 얇은 라우터.

## 발동 조건
사용자 메시지가 다음 중 하나에 해당할 때 본 스킬을 인보크한다.

- `stage-start {0|1|2}` 또는 `stage-start {0|1|2} {feat-name}` 패턴 포함(대시/공백 변형 허용).
- `stage-end {0|1|2}` 패턴 포함.
- 한국어 자연어: "Stage {N} 시작", "Stage {N} 진행", "Stage {N} 저장", "다음 Stage로", "이제 구현 진행".

이미 활성화된 세션에서는 중복 인보크하지 않는다.

## 1. 목적
- 복잡한 기능을 "아이데이션 → 기능 설계 → 구현 계획"의 3단계로 나누어 일관된 포맷으로 기록한다.
- 각 단계 산출물을 `docs/spec/{feat-name}_s{N}.md` 로 저장해 리뷰·롤백이 가능하도록 한다.
- `CLAUDE.md`의 기존 "Planning Rules"(코드 금지, 1~2줄 요약)를 Stage 1·2의 하위 규칙으로 흡수한다.

## 2. 트리거

### 2.1 진입
다음 중 어느 하나가 감지되면 해당 Stage 모드로 진입한다.

- 슬래시 커맨드: `/stage-start {N} [feat-name]`
- 자연어: `stage-start {N} [feat-name]`, `Stage {N} 시작`, `Stage {N} 진행`
- `{N}` 생략 시 Stage 0(Ideation)으로 간주.
- `[feat-name]` 은 kebab-case. 누락 시 Claude가 맥락에서 추정해 사용자에게 확인.

### 2.2 종료
- 명시 종료: `/stage-end {N}` 또는 `stage-end {N}`.
- 맥락 종료: 사용자가 "다음 Stage로", "저장해줘", "이제 구현 진행" 등을 요청하면 현재 Stage를 종료로 해석.
- 종료 시 문서 저장을 제안하고, 사용자 확인 후 Write 한다. **자동 저장 금지**(허가 스코프 존중).

### 2.3 입력 파싱(공통)
슬래시 커맨드와 자연어 진입 모두 동일하게 처리한다.

1. raw 인자(`$ARGUMENTS` 또는 자연어 토큰)를 공백 기준 분해. 첫 토큰을 `{stage_number}`, 나머지를 `{feat-name}` 후보로 본다.
2. `{stage_number}` 가 0/1/2 이외 또는 누락이면 사용자에게 재확인.
3. `{feat-name}` 정규화: 공백·언더스코어 → 하이픈, 영문 소문자화, 한글/특수문자는 사용자에게 영문 kebab-case 제안. 정규화 결과를 사용자에게 한 번에 확인받는다(예: `"newskill_FeverTime"` → `"newskill-fevertime"`).
4. `{feat-name}` 누락 시 최근 대화 맥락에서 추정해 kebab-case로 제시.

## 3. Stage 정의

### Stage 0 — Ideation
- 자유 브레인스토밍. 방향·목표·제약을 탐색.
- 결론을 강제하지 않는다. 사용자가 "좁혀줘"라고 요청하기 전까지는 옵션을 열어둔다.
- 산출물 저장은 선택. 저장 시 경로는 `docs/spec/{feat-name}_s0.md` 를 사용한다(헤더·저장 절차는 §5 동일 적용).
- **컨텍스트 예산**: 소스 파일 직접 읽기 금지. 코드베이스 정보가 필요하면 Codebase State Summary 서브에이전트에 위임.

### Stage 1 — Feature Specification
- 기능 요구사항 구체화 + 데이터/상태 모델 설계 + 영향 범위 식별.
- **코드 금지**. 파일 경로 + 1~2줄 요약. `CLAUDE.md` Planning Rules 전면 준수.
- 섹션 예: 컨셉, 레벨/수치, 데이터 모델, 활성 로직, 마이그레이션, IPC 계약, 엣지케이스, 영향 파일표, 확인 필요 항목.
- 종료 전 **확인 필요 항목** 리스트를 제시하고 사용자 답을 받는다.
- **컨텍스트 예산** (정성 기준): 설계 결정에 직접 기여하는 좁은 범위 읽기(예: 특정 매크로 시그니처)만 허용. 광범위 탐색·확인성 재읽기·결정에 기여 안 하는 주변 코드 읽기는 회피하고 Impact Research 서브에이전트에 위임. (정량 회수 제한 폐기 — 측정 비용이 절감 효과보다 큼.)
- **작업 규모 추정 — 외부 IO + cross-cutting 키워드 점검** (Medium+ advisory, §6 발효·만료 메커니즘 적용): 다음 두 신호 중 하나라도 충족하면 s2 에서 Phase ≥ 2 로 분할 의무.
  - **외부 IO 결과량 ≥ 50K char** — 단일 MCP/`git`/web 도구 호출의 결과 크기. 사전 추정 또는 1회차 실측으로 판정.
  - **Cross-cutting 키워드 ≥ 1 매치** — `i18n` / `security` / `migration` / `cargo` / `cross-cutting` 중 하나가 컨셉 텍스트 변경 영향에 등장. 매치는 `-`/`_`/공백 경계 단위 정확 단어, 룰 정의어 자체 등장(예: 본 항목 자체) 제외.
  - 둘 다 미충족이면 단일 Slice 가능. s1 에 "단일 Slice 가능" 1줄을 기재하고, §3 Phase Contract 인수조건 첫 항목 표준 1줄을 면제할 수 있다(분할 의무 ≠ 분할 강제 — 충족 시에도 단일 Phase 확정 무방, 단 비-verifiable 단일 Phase 는 plan 에 "다음 Phase 와 1 commit 묶음" 명시 의무).
- **의무 산출물** (Medium+ 피처): 본 §3 하단의 "Stage 1·2 의무 산출물 표" 참조.

### Stage 2 — Implementation Plan
- Stage 1 기반의 Phase 단위 구현 순서, 테스트 체크리스트, 롤백/리스크 설계.
- **코드 금지** 유지. 실제 코드는 이 Stage 이후의 구현 단계에서만 작성.
- 섹션 예: UI/UX, Phase A~H 순서, 테스트 체크리스트, 안전장치·롤백, 리스크·열린 이슈.
- **컨텍스트 예산** (정성 기준): 인수조건 검증을 위한 타겟 읽기만 허용. s1 결정 재검토용 광역 읽기는 회피하고 Assumption Verifier 서브에이전트에 위임.
- **사전 `[T]` 추정** (advisory §6 footnote 2): Stage 2 진입 시 외부 IO 호출 ≥3 또는 광역 grep ≥4회 예상되면 해당 Phase 에 `[T]` 마커 사전 추정(사후 retrospective 마킹과 별개 — D6). (subagent-dispatch-tuning Footnote 5 본문 완화로 `[T]` 추정은 §5.4 위임 트리거에서 제외 — 메인 직접 처리 범위. `[T]` 마커는 회고용 추적 목적만 유지.)
- **의무 산출물** (Medium+ 피처): 본 §3 하단의 "Stage 1·2 의무 산출물 표" 참조.

### 공통 의사결정 기준 (Stage 0·1·2 공유)

Stage 진행 중 사용자 답변이 없는 결정 항목을 자율 판단할 때 다음 우선순위를 적용한다. §4.3 "수락 확인 생략 원칙" 의 판단 기준을 보강하며, 적용 결과는 s1 §Context Carry 의 결정 행으로 기록한다.

1. **사용자 편의성·유용성 최우선** — 옵션이 기능적으로 등가이거나 일장일단이 모호할 때 사용자 편의·유용성이 더 큰 쪽 선택.
2. **UI/기능 직관성 우선** — UI 패턴·기능 흐름은 사용자 직관(학습 비용 최소·기존 관행 정합) 을 우선.
3. **비크리티컬 이슈는 추천 안 채택** — 크리티컬 영향이 없으면 추천 안(default·선례 일치 옵션) 으로 자율 진행, 사용자에게 묻지 않음.

**크리티컬 영향 정의** (위 1·2·3 적용 정지 + **확인 필요 항목** 으로 사용자 에스컬레이션 의무): 데이터 손실·복구 불가, privacy 누수·비대칭, 라이프사이클 누수, security boundary 침범, persisted schema 비역성, UX 비가역 변경. 본 6범주 중 어느 하나라도 해당하면 자율 판단 금지.

### 서브에이전트 타입 (Stage별)

| Stage | 서브에이전트 역할 |
|---|---|
| Stage 0 | Codebase State Summary — 소스 직접 읽기 없이 관련 코드 상태 요약 전달 |
| Stage 1 | Impact Research — 영향 범위 분석; Quality Oracle — s1 완성도 검증 |
| Stage 2 | Assumption Verifier — s1 전제조건 열 검증; Harness Readiness Oracle — s2 완성도 검증 |
| Harness Phase | Phase Contract + Context Carry + Ledger 수신 후 Phase 실행 |

### Stage 1·2 의무 산출물 표 (Medium+ 피처)

| Stage | 의무 산출물 | 형식·하한 | Tier별 적용 |
|---|---|---|---|
| Stage 1 | `§ Context Carry` 섹션 | 결정 / 기각 옵션 / 기각 사유 표, **결정 항목 ≥2개** (s1 Q6) | Medium+ 의무 · Low 면제 |
| Stage 1 | ATK 체크리스트 | 4문항: 인접 불변조건 · 이전 실패 · 비명시 제약 · MVP 경계. **ATK 매핑표 5종 권장**(lifecycle / 외부 출력 / baseline / API grep / listener 중복) — advisory §6 footnote 2 | Medium = 의무 2(인접 불변·이전 실패) + 권장 2 · High = 4 전체 의무 · Low 면제 (s1 Q11) |
| Stage 1 | `§ 영향 파일 표`에 **전제조건 열** + **`file:line` 인용 컬럼**(advisory §6 footnote 2) + **사전 `grep -rl` 실행 결과 인용**(advisory §6 Footnote 4) | Assumption Verifier 입력 보장. 라이브러리 외부 심볼은 `extern:` 마커, 신규 파일은 `new`, 다지점은 `multi` 사용. 영향 파일 표 작성 전 `grep -rl '<대상 패턴>'` 실행 → 결과를 인용 컬럼 또는 §Scope 메모로 기재 권장 (`[pre-grep-trigger]`). | Medium+ 의무 · Low 면제 |
| Stage 2 | Phase Contract (Phase 블록당) | 6필드: 전제조건 / **인수조건(≥2)** / 루프예산 / 롤백 / 서브에이전트 스코프(파일 목록 + 참조할 s1 섹션 + **mode** + **trigger 매칭 근거** + **Hard Constraint 통과 증거** — subagent-dispatch-tuning 제안 2, advisory §6 Footnote 5) / 에스컬레이트 조건. **각 인수조건 줄에 `[verify:]` 9종 태그 권장**(grep / hooks:test / tsc / vitest / cargo / lint / manual / runtime-deferred / 복합 조합) — advisory §6 footnote 2. **서브에이전트 스코프 3신규 필드**: (a) `mode` ∈ {`main`, `subagent:T1`, `subagent:T2`, `subagent:T3`} (b) trigger 매칭 근거 1~2줄 (T1=대규모 read-only / T2=3개+ 독립 모듈 / T3=노이즈 큰 검증) (c) Hard Constraint 통과 증거 4항(설계 결정 입력 없음 / 상호 의존 다중 파일 수정 아님 / 디버깅·원인 추적 아님 / 5턴 초과 아님). 못 채우면 `mode: main` 강제. | Medium = 필수 4 + 기본값 2(루프예산 3·에스컬레이트 표준) · High = 6 전체 의무 · Low 면제 (s1 Q12) |

기본값 자동 채택 규칙(Medium 한정)은 s1 §2.2를 참조한다. 누락은 Quality Oracle / Harness Readiness Oracle 가 차단한다.

Phase Contract 인수조건 **첫 항목 표준 1줄** (Medium+ advisory, §6 발효·만료 메커니즘 적용): **"이 Phase 단독으로 main 머지 시 빌드·테스트 통과(= 독립 verifiable)"**. 작업 규모 추정에서 단일 Slice 가 확정된 경우 본 항목 비활성(s1 에 면제 명시).

## 4. Stage 진입·전환

### 4.1 이전 Stage 문서 자동 복원(resume)
Stage 진입 시(=`stage-start N`) 다음 절차를 수행한다.

1. `docs/spec/{feat-name}_s{N}.md` 존재 시 → 한 줄 알림 후 **기본은 이어쓰기**로 즉시 plan-mode 작업을 시작한다(수락 확인 생략, §4.3). 새로 시작 / 덮어쓰기는 사용자가 명시 요청 시에만 적용하고, 최종 충돌 처리는 `/stage-end` 의 §5.3 덮어쓰기 가드에 위임한다.
2. `N >= 1` 이면 이전 Stage 문서(`_s{N-1}.md`, …, `_s0.md` 순서로 가장 가까운 것)를 `Read` 로 로드해 컨텍스트를 복원한다. 없으면 한 줄로 알리고 기본 진행한다(진행 여부 재확인 생략).
3. `N == 2` 이고 `_s1.md` 가 존재하지 않으면 **경고 한 줄**을 남긴다. 이는 차단 게이트가 아니며, 최종 수락은 `/stage-end` 의 §5.2 게이트에서 받는다.

### 4.2 Stage 전환
- Stage N 종료 선언 → 다음 Stage 진행 여부를 사용자에게 확인.
- 확인 필요 항목은 Stage 종료 직전에 모아서 제시한다. 사용자가 확정한 뒤 다음 Stage로 진입.
- 같은 feature에 대해 Stage를 역행(예: 2→1)하는 경우에도 동일 경로를 덮어쓰지 않고 §5.3 덮어쓰기 가드를 따른다.

### 4.3 모드 정책 — 계획 모드 기본 / 편집 모드 전환

`stage-start` 진입 시 항상 **계획 모드**로 시작한다. 사용자의 명시 요청 없이는 편집 모드로 넘어가지 않는다.

**계획 모드(기본)** — 허용·금지 도구
- 허용: `Read`, `Grep`, `Glob`, 읽기 전용 `Bash`(`git status`/`git diff`/`git log`/`ls`/`cat` 등), 읽기 전용 서브에이전트(Explore, Plan, Codebase State Summary, Impact Research, Assumption Verifier 등), `mcp__gemini-review__review_plan`(읽기 전용 검토).
- 금지: `Write`, `Edit`, `NotebookEdit`, 상태 변경 `Bash`(파일 변경/`git commit`/`git push`/`git add`/`rm`/`mv`/패키지 설치 등), 쓰기 권한 MCP 도구.
- 산출물 미리보기는 채팅 메시지로만 제시한다. 파일 저장·커밋·푸시는 일절 수행하지 않는다.

**편집 모드 전환 트리거** — 다음 중 하나가 감지되면 전환한다.
- 사용자의 명시 요청: "편집 모드로", "edit mode", "이제 저장해줘", "지금 작성해줘", "코드 작성 시작" 등.
- `/stage-end` 호출(§5.4 저장 절차의 일부로 자동 편집 모드 진입).
- 실제 코드 수정이 필요한 다른 슬래시 커맨드(`/release-*` 등) 호출.

**전환 절차**
1. 전환 트리거 감지 직후, 메인 에이전트는 한 줄로 모드 전환 사실과 다음에 수행할 쓰기 동작을 사용자에게 명시한다(예: "편집 모드 전환 → `docs/spec/{name}_s{N}.md` Write").
2. 의도와 다른 트리거(예: 사용자가 단지 "거의 다 됐네"라고 답한 경우)는 전환하지 않고 재확인한다.
3. 편집 모드 동안에도 §5.4 저장·커밋·푸시 규칙(특히 push 자동 금지)은 그대로 적용된다.

**되돌아가기**
- 저장·커밋이 끝나거나 사용자가 "다시 계획만"이라고 요청하면 다시 계획 모드로 복귀한다.
- 동일 Stage 세션이 길어져도 새로운 쓰기 작업이 필요할 때마다 위 전환 절차를 다시 수행한다(한 번 받은 동의를 무한 확장하지 않는다).

**플랜 진행 — 수락 확인 생략 원칙**
- 계획 모드에서는 stage 작업을 단계별 "수락 확인" 없이 연속 진행한다. "여기까지 OK?" / "다음으로 넘어갈까요?" / "이대로 진행해도 될까요?" 같은 진행 동의 질문은 묻지 않는다.
- `/stage-end` 호출 자체가 "이 Stage 작업을 수락한다"는 사용자 신호로 간주한다 — 누적된 **확인 필요 항목** 과 최종 산출물 미리보기는 §5.2 종료 게이트에서 일괄 제시되어 그곳에서 수락을 받는다.
- 다음 두 가지는 "수락 확인"이 아니므로 그대로 묻는다:
  - 결정이 필요한 **설계 질문**(택일·누락 정보 보충): plan 자체를 진척시키기 위해 필수.
  - **편집 모드 전환 트리거의 모호성 해소**: 위 "전환 절차" 2번 항목(예: "거의 다 됐네"가 의도된 종료인지) — 안전장치이므로 유지.
- 일관성: §4.1 자동 복원의 한 줄 알림, §3 Stage 1 종료 전 "확인 필요 항목" 제시도 위 원칙에 따라 차단 없이 흐른다.

**구현 작업 범위 — 명시 요청 한정**
- 계획 모드에서 plan 이 사용자 승인을 받았다 하더라도, 그리고 `/stage-end` 가 호출되었다 하더라도, 그것은 **"산출 문서를 저장해도 좋다"는 신호일 뿐 "이 plan 을 지금 코드로 구현하라"는 신호는 아니다**. Stage 작업 종료 = 구현 시작이 아니다.
- `/stage-end` 가 트리거하는 편집 모드의 범위는 §5.4 절차에 한정된다: **Stage 산출 문서(`docs/spec/{name}_s{N}.md`)의 Write·`git add`·commit 만** 수행한다. 산출 문서가 기술하는 **소스 코드(`src/**`, `src-tauri/**` 등) 변경, 새 파일 생성, 의존성 추가, 빌드·테스트 실행은 일절 시작하지 않는다**.
- 코드 구현은 사용자의 별도 **명시 요청** 이 있을 때만 진입한다. 예시 트리거:
  - "이제 구현 시작" / "Phase A 작성해줘" / "코드 작성 시작" 등 명시 명령.
  - 슬래시 커맨드: `/harness-start {feat-name}` (Medium+ 피처 권장 진입점).
- 구현 진입 시에는 별도의 편집 모드 전환 통지(위 "전환 절차" 1번)를 다시 수행한다. 즉 Stage 문서 저장 → 자동 코드 구현 흐름은 금지.
- 다음 Stage 진행도 별도 명시 요청 시에만(`stage-start {N+1}`). `/stage-end` 가 끝났다고 자동으로 다음 Stage로 넘어가지 않는다.

## 5. 저장 규칙

### 5.1 경로·헤더
- 경로: `docs/spec/{feat-name}_s{N}.md` (Stage 0~2 공통).
- `{feat-name}` = kebab-case. 예: `fever-time`, `new-skill-fevertime`, `rebirth-v2`.
- frontmatter 표준: `kind: feat|fix`, `name: {feat-name}`, `stage: {N}`, `status: active|complete|archived`
- 헤더: `# {Feature} — Stage {N} {title}`.
- 서두에 이전 Stage 참조 한 줄(예: `> Stage 0 문서: docs/spec/fever-time_s0.md` 또는 "해당 없음").

### 5.2 종료 직전 게이트(체크리스트 합의)
Stage 1·2 종료 시 다음을 강제한다.

1. **확인 필요 항목**이 합의되지 않은 채라면 저장 보류. 미해결 항목을 다시 제시해 사용자 결정을 받는다.
2. Stage 2 저장 직전, `_s1.md` 존재를 다시 확인. 없으면 §4.1.3 경고 재확인.
3. **(advisory · §6 Footnote 5 — 신규 feature만, subagent-dispatch-tuning 제안 2)** Stage 2 저장 직전, 각 Phase Contract 서브에이전트 스코프에 **mode + trigger 매칭 근거 + Hard Constraint 통과 증거** 3신규 필드(§3 표 참조) 완비 확인. 미완비면 `[subagent-dispatch-trigger]` ledger Decision Log 기록 후 진행 (차단 아님). 기존 진행 중 ledger는 **grandfathered** — 본 advisory 발효 시점에 이미 저장된 s2는 재작성 강제 안 함.
4. 위 게이트를 통과한 뒤에만 저장 절차(§5.4)로 진입.

### 5.3 덮어쓰기 가드
저장 직전 대상 파일이 이미 존재하면:

1. 사용자에게 **덮어쓰기 / 다른 이름으로 / 취소** 중 하나를 묻는다.
2. "다른 이름으로" 선택 시 suffix(`_v2`, `_revised` 등)를 제안.
3. 명시 동의 없이는 기존 파일 덮어쓰기 금지.

### 5.4 기본 액션 — 저장·커밋·컨텍스트 압축
1. 사용자 승인 후 문서 저장.
   - **기본은 메인 에이전트의 직접 `Write`** (subagent-dispatch-tuning 제안 1). Sub-agent Dispatch Policy(`9cc1bd52-SKILL.md`)의 Hard Constraint — "5턴 이내 작업 / 방금 작성한 코드 / 메인이 이미 로드한 컨텍스트" 3개에 동시 해당하므로 단일 Write 위임은 토큰·시간·품질 모두 손해.
   - **위임 예외 — 단일 호출 결과 ≥ 50K char 일 때만** general-purpose 서브에이전트 위임 가능. Stream idle timeout 위험 등 격리 이득이 부팅 오버헤드를 상회하는 거대 산출물 안전망.
   - 위임 시 절차:
     1. 메인 에이전트는 본문 **전체** + 대상 절대경로(`docs/spec/{feat-name}_s{N}.md`) + 아래 A1 Task Prompt 4섹션을 담아 호출.
     2. 서브에이전트는 단일 `Write` 만 수행, 결과로 (a) 저장 경로 (b) 줄 수 (c) 첫 헤더 한 줄 회신.
     3. 메인 에이전트는 회신값 검증 + 대상 파일 첫 ~30줄 `Read` 확인 + 아래 A3 통합 검토 단계 수행.
     4. 검증 실패 시 메인 직접 `Write` 재작성(루프예산 1회).
2. 저장 직후 같은 문서 파일만 스테이징(`git add docs/spec/{feat-name}_s{N}.md`)하고, 커밋 메시지 `docs({feat-name}): Stage {N} {title}` 형식으로 `git commit` 실행.
3. 커밋 성공 후 `/compact` 를 호출해 세션 컨텍스트를 압축한다. 직접 슬래시 호출이 불가능한 환경이면 마지막 응답에 `/compact` 실행 요청을 명시.
- 사용자가 "커밋하지 마" 등 명시적으로 거부하면 위 2·3단계를 건너뛴다.
- **푸시는 여전히 사용자 명시 요청 시에만** 수행(CLAUDE.md git safety protocol 준수). 자동 push 금지.
- **위임 단일 임계** (advisory §6 Footnote 5 — subagent-dispatch-tuning 제안 1; 기존 §6 Footnote 2 C4의 "OR 4중"을 본 임계로 완화): 단일 호출 결과 **≥ 50K char** 인 경우에만 서브에이전트(general-purpose) 위임 권장. 영향 파일 ≥4 / 외부 IO ≥3 / 사전 `[T]` 추정은 위임 트리거에서 제외 — 모두 메인 직접 처리 범위 (Sub-agent Dispatch Policy Hard Constraint "메인이 이미 로드한 컨텍스트로 처리 가능" 정신). 결과 검증은 메인이 첫 ~30줄을 `Read` 로 확인 + A3 통합 검토 단계 적용.

- **G2 위임 방식 2분기 명시** (advisory §6 Footnote 4): Phase Contract 서브에이전트 스코프 첫 줄에 `mode: subagent` / `mode: main-batch` 중 하나를 명시. `main-batch` = sed/awk 일괄 치환 또는 1~2 파일 메인 Edit. 누락 시 `[delegation-mode-trigger]` ledger 기록. Medium+ 적용 · Low 면제. 발효일 이후 신규 feature 부터. **후속**: Footnote 5 G3가 본 mode 값을 `main` / `subagent:T1/T2/T3`로 세분화 + trigger 매칭 근거·Hard Constraint 통과 증거 3신규 필드로 확장 — G3 발효 시 본 G2 prefix는 superseded.

- **A1 — Task Prompt 4섹션 의무** (sub-agent 위임 시, advisory §6 Footnote 5 — subagent-dispatch-tuning 제안 3): Sub-agent Dispatch Policy(`9cc1bd52-SKILL.md`) §Task Prompt 템플릿에 따라 위임 spec을 다음 4섹션으로 구성. Authority 누락이 "메인이 모르는 결정이 코드에 박힘" 사고의 주된 원인이므로 필수.
  - **Role** (1줄): 위임 작업의 한 줄 설명. 예: "코드베이스에서 X의 사용처를 모두 찾는 read-only 탐색".
  - **Authority**: (a) 변경 가능 파일 목록 (또는 "없음 — 조회 전용") (b) 결정 권한 범위 ("없음" / "구현 세부만" / "X에 한해 결정 가능") (c) "범위 밖 결정 발생 시 결정하지 말고 보고만" 명시 의무.
  - **Inputs**: 명세·데이터·파일 경로·참조 패턴·상위 작업 맥락 1줄.
  - **Output**: 형식(구조화 텍스트/JSON/Markdown 표) · 필수 항목 · 금지(과정 설명·추측·권한 범위 밖 결정) · 길이 상한.
  - 위반 = 4섹션 누락 → `[subagent-authority-trigger]` (§6 Footnote 5).

- **A2 — Self-verify footer** (general-purpose 위임만, advisory §6 Footnote 3): 위임 spec 말미에 다음 footer 표준 부착. 면제 = Explore / Plan / 특화 agent.
  - 헤더: `## Self-verify (mandatory last step)`
  - 안내: `Run these greps and include exact match counts in your reply:`
  - grep 행 ≥1개: `<번호>. grep -n '<symbol>' <path>   # expected: == <N>` (연산자 `==`/`>=`/`<=`, GNU grep `-n/-r/-E` 한정 cross-platform 호환)
  - 종료: `` If any expected count not met, reply `PARTIAL: <missing items>` instead of `DONE`. ``
  - 메인 후처리:
    1. 회신 마지막 줄 `DONE`/`PARTIAL: …` 확인.
    2. **첫 grep 1건 메인 Bash 직접 재실행** → expected 충족 검증 (agent 거짓성공 방어).
    3. `PARTIAL` or 메인 검증 실패 → 누락 항목만 좁힌 새 spec 으로 재위임 (루프예산 1회).
    4. 재위임 후에도 `PARTIAL` or 메인 검증 실패 → **`fallback-to-main`** (위임 포기, 메인 직접 처리, ledger `status` 컬럼 `fallback-to-main` 기입).
    5. `DONE` + 메인 검증 통과 → 다음 단계.
  - 위반 = footer 부재 → `[subagent-verify-trigger]` (§6 Footnote 3).

- **E1 — Subagent Invocations 1행 기입** (위임 완료 직후, advisory §6 Footnote 3): ledger `## Subagent Invocations` 표에 1행 기입. Phase 종료/`/stage-end` 일괄 금지. 컬럼 = `Date / Phase / Agent ID / task / duration_ms / total_tokens / tool_uses / status`. `status` ∈ {`DONE` / `PARTIAL` / `fallback-to-main`} 이 partial 상태를 이미 포함하므로 별도 `partial?` 컬럼 부재. task-notification 미수신값 = `unknown` 문자열 (skip/추정 금지). 위반 = 1행 누락 → `[subagent-metrics-trigger]` (§6 Footnote 3).

- **Privacy scrub** (ledger `task` / Self-verify footer 작성 시, non-negotiable "Privacy scrubber" 직결): user dir 절대경로 (`/Users/<name>/...`, `/home/<name>/...`) · 원문 사용자 입력 · 외부 토큰/API 키 · 화면 캡처 경로 인용 금지. 상대 경로 + symbol 명 + 동작 동사만 기입 (예: ✅ `add Self-verify footer to design-rule §5.4` / ❌ `grep '/Users/john/secrets.env' for API_KEY`). 위반 = PII/path 노출 감지 → `[subagent-privacy-trigger]` (§6 Footnote 3).

- **A3 — 통합 검토 단계** (sub-agent 산출 직후, advisory §6 Footnote 5 — subagent-dispatch-tuning 제안 3): Sub-agent Dispatch Policy §통합 검토 단계 그대로. 메인 에이전트는 산출물에 대해 다음 3개 항목을 확인하고 ledger Decision Log에 검토 결과 1줄 기록.
  1. **권한 범위 벗어난 결정 포함 여부** — A1 Authority에 명시된 결정 권한 범위 밖에서 sub-agent가 결정을 내렸는지 확인.
  2. **메인 컨텍스트 제약 위반 여부** — sub-agent가 모르는 메인 컨텍스트 제약(Hard Constraint / privacy / 기존 결정과의 일관성)을 위반했는지 확인.
  3. **다른 단계와의 일관성** — 이전 Phase / 다른 sub-agent 산출과의 모순 여부 확인.
  - 검토 통과 → 다음 단계 진행.
  - 검토 실패 → 누락 항목만 좁힌 새 spec으로 재위임 (루프예산 1회) 또는 fallback-to-main.
  - 위반 = 검토 단계 생략 (ledger 1줄 누락 포함) → `[subagent-review-trigger]` (§6 Footnote 5).

## 6. 작업 분할 룰 발효·Auto-expire (advisory · 자기 만료)

<!-- §6-UNFIRED-BEGIN: Footnote 1·2·3 all in placeholder state until merge-commit-iso8601 filled. Automation should skip rule activation while this fence exists. -->

> **현재 상태**: 본 §6 Footnote 1·2·3 모두 `<merge-commit-iso8601>` placeholder 미채움 상태 — **공식 미발효**.
> 머지 commit 시각이 채워지기 전까지 모든 Footnote 게이트는 dogfooding 권장 사항이며 발동 카운트 누적은 시작되지 않는다.
> 채움 절차: 본 PR/묶음 머지 직후 1줄 수기 follow-up commit (`docs(harness): activate §6 Footnote {N}` 형식) 으로 ISO8601 시각 placeholder 를 실제 값으로 치환.
> 발효 완료 후 본 `<!-- §6-UNFIRED-BEGIN -->` / `<!-- §6-UNFIRED-END -->` 펜스 제거.

### Footnote 1 — 작업 분할 묶음 (기존)

- **발효일**: `<merge-commit-iso8601>` (미발효 — placeholder 상태. 본 PR 머지 commit hash ISO8601 시각, 머지 후 footnote 1줄 follow-up commit 으로 채움). 발효일 이후 신규 Medium+ feature 부터 §3 작업 규모 추정 + §3 Phase Contract 인수조건 표준 1줄 의무. (§5.4 위임 1줄 의무는 subagent-dispatch-tuning Footnote 5로 **단일 임계 (≥50K char)** 로 완화됨.) **Low 면제. High 티어는 본 룰 면제 ≠ High 자체 의무 면제** (의무 산출물 표 §3 그대로 유지).
- **Advisory 운영 30일**: Quality Oracle / Harness Readiness Oracle 가 본 룰을 경고로만 노출 — 차단 게이트 아님.
- **발동 카운트 측정**: ledger 발동 키워드 `[work-slicing-trigger]` 태그를 `git log -- 'docs/spec/*_harness_ledger.md'` + working tree `grep -r '\[work-slicing-trigger\]' docs/` 병행 수집(미커밋 ledger 누락 회피).
- **발효일 +30일 시점 분기**: 발동 ≥ 3건 + 사용자 명시 escalate 시 차단 게이트 승격 가능 — Stage 1 재진입을 통해서만(즉시 본문 변경 금지). 발동 0 또는 escalate 부재 시 **auto-expire = 룰 본문 4지점(§3 작업 규모 추정 sub절 / §3 Phase Contract 인수조건 표준 / §5.4 위임 1줄 / 본 §6) 수동 제거 + 검증 issue 수동 생성** (자동화 헬퍼 0).
- **부분 폐기 PR 가능** — 그 경우 auto-expire 시점 reset 없음, 머지 일자 유지.
- **30일 freeze 권장** (advisory · 차단 게이트 아님): 본 PR 머지 후 design-rule.md 추가 룰 변경 지양. "룰 9일 5회 변경" 안티패턴 재발 방지.

### Footnote 2 — Retrospective 기반 advisory 묶음 (harness-retrospective-base-improve)

- **발효일**: `<merge-commit-iso8601>` (미발효 — placeholder 상태. 본 advisory 묶음 최종 Phase 머지 commit hash ISO8601 시각 — 머지 후 1줄 수기 follow-up commit). 발효일 이후 신규 Medium+ feature 부터 아래 advisory 게이트 6종 적용. Low 면제.
- **Advisory 게이트 6종**:
  - **C1** §3 의무 산출물 표 Stage 1 영향파일 행 — `file:line` 인용 컬럼 권장.
  - **C2** §3 의무 산출물 표 ATK 행 — 매핑표 5종(lifecycle / 외부 출력 / baseline / API grep / listener 중복) 권장.
  - **C3** §3 의무 산출물 표 Stage 2 Phase Contract 행 — 각 인수조건 줄에 `[verify:]` 9종 태그 권장.
  - **C4** §5.4 위임 **단일 임계 (≥50K char)** 권장. (Footnote 5로 OR 4중 → 단일 임계 축소.)
  - **C5** `.claude/skills/harness-entry/SKILL.md` Readiness Validation — s1 `file:line` 인용 grep + s2 `[verify:]` 태그 grep advisory.
  - **C6** `.claude/skills/privacy-by-design/SKILL.md` Required Checks — 외부 출력 표면 9종 체크리스트 advisory.
- **Advisory 운영 30일**: 본 6게이트는 경고만, 차단 아님. Quality Oracle / Harness Readiness Oracle / staged 워커 모두 advisory 모드.
- **발동 카운트 측정**: ledger 발동 태그 3종 — `[s1-grep-trigger]` · `[verify-tag-trigger]` · `[privacy-surface-trigger]`. 측정: `git log -- 'docs/spec/*_harness_ledger.md'` + working tree `grep -r '\[(s1-grep|verify-tag|privacy-surface)-trigger\]' docs/` 병행.
- **발효일 +30일 시점 분기**:
  - 발동 ≥ 3 + 사용자 명시 escalate → 차단 게이트 승격 가능 (Stage 1 재진입 필수, 즉시 본문 변경 금지).
  - 발동 0 → **auto-expire**: 룰 본문 6지점(§3 의무 산출물 표 3행 · §3 Stage 2 사전 `[T]` 추정 · §5.4 위임 단일 임계 문구 (Footnote 5로 축소된 후) · 본 §6 Footnote 2) 수동 제거 + 검증 issue 수동 생성 (자동화 헬퍼 0).
  - **발동 ≥ 3 + escalate 부재 → 유보** (자동 판단 안 함, 다음 사용자 세션 입력 시 결정. 크리티컬 영향 자동 결정 금지 — §3 공통 의사결정 기준).
- **본 PR 자체 grandfathered**: 발효일이 본 PR 최종 Phase 머지 commit이므로 자기 적용 회귀 없음. `file:line` 인용·`[verify:]` 태그·ATK 매핑표는 자발적 dogfooding.
- **30일 freeze 권장**: 본 PR 머지 후 design-rule.md / harness-loop.md / privacy-by-design SKILL 추가 룰 변경 지양.

### Footnote 3 — Subagent delegation hygiene advisory 묶음 (harness-task-lack-improve)

- **발효일**: `<merge-commit-iso8601>` (미발효 — placeholder 상태. 본 PR 머지 commit hash ISO8601 시각 — 머지 후 1줄 수기 follow-up commit). 발효일 이후 신규 general-purpose 위임부터 아래 advisory 게이트 3종 적용. Low/Medium/High 모두 적용 (위임 타입 기준이라 tier 무관).
- **Advisory 게이트 3종** (모두 §5.4 본문 상주):
  - **A2** Self-verify footer 부착 의무 (헤더·grep·종료 줄) + 메인 첫 grep 재실행 + `fallback-to-main` (재위임 1회 후).
  - **E1** 위임 완료 직후 ledger `## Subagent Invocations` 1행 기입. 미수신값 `unknown`.
  - **Privacy scrub** ledger `task` / footer 작성 시 user dir 절대경로·원문 입력·토큰 노출 금지.
- **Advisory 운영 30일**: 본 3게이트는 경고만, 차단 아님. Quality Oracle / Harness Readiness Oracle / staged 워커 모두 advisory 모드.
- **발동 카운트 측정**: ledger 발동 태그 3종 — `[subagent-verify-trigger]` · `[subagent-metrics-trigger]` · `[subagent-privacy-trigger]`. 측정: `git log -- 'docs/spec/*_harness_ledger.md'` + working tree `grep -rE '\[subagent-(verify|metrics|privacy)-trigger\]' docs/` 병행.
- **발효일 +30일 시점 분기**:
  - 발동 ≥ 3 + 사용자 명시 escalate → 차단 게이트 승격 가능 (Stage 1 재진입 필수, 즉시 본문 변경 금지).
  - 발동 0 → **auto-expire**: 룰 본문 5지점(§5.4 A2 / §5.4 E1 / §5.4 Privacy scrub / 본 §6 Footnote 3 / HARNESS_LEDGER_TEMPLATE.md `## Subagent Invocations` 섹션) 수동 제거 + 검증 issue 수동 생성 (자동화 헬퍼 0).
  - **발동 ≥ 3 + escalate 부재 → 유보** (자동 판단 안 함, 다음 사용자 세션 입력 시 결정. 크리티컬 영향 자동 결정 금지 — §3 공통 의사결정 기준).
- **본 PR 자체 grandfathered**: 발효일이 본 PR 머지 commit이므로 자기 적용 회귀 없음. 본 PR 작업의 위임은 자발적 dogfooding.
- **30일 freeze 권장**: 본 PR 머지 후 design-rule.md / harness-entry SKILL / HARNESS_LEDGER_TEMPLATE.md 추가 룰 변경 지양 ("룰 9일 5회 변경" 안티패턴 재발 방지).

### Footnote 4 — Subagent delegation efficiency advisory 묶음 (harness-improve-v1)

- **발효일**: `<merge-commit-iso8601>` (미발효 — placeholder 상태. 본 PR 머지 commit hash ISO8601 시각 — 머지 후 1줄 수기 follow-up commit). 발효일 이후 신규 Medium+ feature s1/s2 작성부터 아래 advisory 게이트 2종 적용. Low 면제.
- **Advisory 게이트 2종**:
  - **G1** §3 의무 산출물 표 Stage 1 영향파일 행 — 영향 파일 표 작성 전 `grep -rl '<대상 패턴>'` 실행 결과를 s1 §영향 파일 표 인용 컬럼 또는 §Scope 메모로 기재 권장. 누락 시 `[pre-grep-trigger]` ledger Decision Log 기록 후 진행 (차단 아님).
  - **G2** §5.4 Phase Contract 서브에이전트 스코프 — 첫 줄에 `mode: subagent` / `mode: main-batch` 명시 권장. 누락 시 `[delegation-mode-trigger]` ledger Decision Log 기록 후 진행 (차단 아님). **후속**: Footnote 5 G3가 mode 값을 `main` / `subagent:T1/T2/T3`로 세분화 + trigger 매칭 근거·Hard Constraint 통과 증거 추가 — G3 발효 시 G2 prefix는 superseded.
- **Advisory 운영 30일**: 본 2게이트는 경고만, 차단 아님.
- **발동 카운트 측정**: ledger 발동 태그 2종 — `[pre-grep-trigger]` · `[delegation-mode-trigger]`. 측정: `git log -- 'docs/spec/*_harness_ledger.md'` + working tree `grep -rE '\[(pre-grep|delegation-mode)-trigger\]' docs/` 병행.
- **발효일 +30일 시점 분기**:
  - 발동 ≥ 3 + 사용자 명시 escalate → 차단 게이트 승격 가능 (Stage 1 재진입 필수, 즉시 본문 변경 금지).
  - 발동 0 → **auto-expire**: 룰 본문 4지점(§3 의무 산출물 표 영향파일 행 G1 문구 / §5.4 G2 위임 방식 2분기 / harness-entry SKILL item 6·7 / 본 §6 Footnote 4) 수동 제거 + 검증 issue 수동 생성 (자동화 헬퍼 0).
  - **발동 ≥ 3 + escalate 부재 → 유보** (자동 판단 안 함 — §3 크리티컬 영향 자동 결정 금지).
- **본 PR 자체 grandfathered**: 발효일이 본 PR 머지 commit이므로 자기 적용 회귀 없음.
- **30일 freeze 권장**: 본 PR 머지 후 design-rule.md / harness-entry SKILL 추가 룰 변경 지양.
- **출처**: `docs/harness/SUBAGENT_DELEGATION_GUIDE.md` §2·§3 비용 분석.

### Footnote 5 — Subagent dispatch policy advisory 묶음 (subagent-dispatch-tuning)

- **발효일**: `<merge-commit-iso8601>` (미발효 — placeholder 상태. 본 PR 머지 commit hash ISO8601 시각 — 머지 후 1줄 수기 follow-up commit). 발효일 이후 신규 Medium+ feature s1/s2 작성부터 아래 advisory 게이트 3종 적용. Low 면제.
- **출처**: `docs/spec/subagent-dispatch-tuning_s1.md` + Sub-agent Dispatch Policy (`9cc1bd52-SKILL.md`).
- **본문 완화 (제안 1)**: §5.4 위임 임계 OR 4중 → **단일 임계 (≥50K char)** 로 축소. 영향 파일 ≥4 / 외부 IO ≥3 / 사전 `[T]` 추정은 위임 트리거에서 제외. 본 항목은 본문 완화이므로 별도 advisory 트리거 없음 — §6 Footnote 2 C4 일관성 갱신과 함께 적용.
- **Advisory 게이트 3종** (모두 §5.4 본문 상주):
  - **A1** Task Prompt 4섹션 의무 (Role / Authority / Inputs / Output). Authority 누락이 "메인이 모르는 결정 누수"의 주된 원인. 면제 = Explore / Plan / 특화 agent 사용 시.
  - **A3** sub-agent 산출 직후 메인 통합 검토 단계 (권한 범위 / 컨텍스트 제약 / 일관성 3항 확인 + ledger Decision Log 1줄 기록). Sub-agent Dispatch Policy §통합 검토 단계 그대로.
  - **G3** s2 Phase Contract 서브에이전트 스코프 3신규 필드 (mode / trigger 매칭 근거 / Hard Constraint 통과 증거). §3 표 + §5.2 종료 게이트 advisory item 3. **신규 feature만 차단, 기존 ledger는 grandfathered**.
- **Advisory 운영 30일**: 본 3게이트는 경고만, 차단 아님. Quality Oracle / Harness Readiness Oracle / staged 워커 모두 advisory 모드.
- **발동 카운트 측정**: ledger 발동 태그 3종 — `[subagent-authority-trigger]` · `[subagent-review-trigger]` · `[subagent-dispatch-trigger]`. 측정: `git log -- 'docs/spec/*_harness_ledger.md'` + working tree `grep -rE '\[subagent-(authority|review|dispatch)-trigger\]' docs/` 병행.
- **발효일 +30일 시점 분기**:
  - 발동 ≥ 3 + 사용자 명시 escalate → 차단 게이트 승격 가능 (Stage 1 재진입 필수, 즉시 본문 변경 금지).
  - 발동 0 → **auto-expire**: 룰 본문 6지점(§3 의무 산출물 표 Stage 2 행 3신규 필드 / §5.2 종료 게이트 advisory item 3 / §5.4 A1 / §5.4 A3 / §5.4 위임 단일 임계 문구 / 본 §6 Footnote 5) 수동 제거 + 검증 issue 수동 생성 (자동화 헬퍼 0).
  - **발동 ≥ 3 + escalate 부재 → 유보** (자동 판단 안 함 — §3 크리티컬 영향 자동 결정 금지).
- **본 PR 자체 grandfathered**: 발효일이 본 PR 머지 commit이므로 자기 적용 회귀 없음. 본 s1 (`docs/spec/subagent-dispatch-tuning_s1.md`) 자체는 본 advisory 발효 전 작성이므로 신규 3필드 미적용도 정합.
- **30일 freeze 권장** (advisory · 차단 게이트 아님): 본 PR 머지 후 design-rule.md / harness-entry SKILL / SUBAGENT_DELEGATION_GUIDE.md / post_edit_quality_gate.mjs 추가 룰 변경 지양.
- **호환성**: §6 Footnote 4 G2(`mode: subagent` / `mode: main-batch` prefix) 와 본 G3의 mode 값(`main` / `subagent:T1/T2/T3`)은 의미적으로 후속 단계 — G3가 활성화되면 G2 prefix는 자연스럽게 superseded (auto-expire 시 일괄 제거).

<!-- §6-UNFIRED-END -->

## 7. 문서 포맷 레퍼런스

신규 문서 작성 시 섹션 구성은 위 예시를 우선 참고하되, feature 성격에 따라 섹션을 가감한다. 중요한 것은:
- 파일별 변경은 1~2줄로 요약
- 코드 블록 금지(명령줄 예시·JSON 스키마 예시 제외)
- 엣지케이스와 확인 필요 항목을 반드시 포함

## 8. CLAUDE.md Planning Rules 와의 관계
- Stage 1·2 동안은 CLAUDE.md의 `## Planning Rules (사용자 지침)` 섹션이 그대로 활성.
- 이 워크플로우는 그 규칙을 세 단계로 구조화하고 산출물 저장 경로를 표준화하는 상위 프레임이다.

## 9. 연동 파일
- `.claude/commands/stage-start.md` — 슬래시 커맨드(진입). 본 SKILL.md 를 `Read` 로 로드해 절차를 따른다.
- `.claude/commands/stage-end.md` — 슬래시 커맨드(종료/저장). 본 SKILL.md 를 `Read` 로 로드해 절차를 따른다.
- `.claude/CLAUDE.md` — 본 SKILL.md 로의 포인터.

> 위 3개 연동 파일은 트리거·인자 전달만 담당한다. 절차 본문은 본 SKILL.md 에만 둔다.
