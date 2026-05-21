---
description: Staged planning workflow — Stage 진입
---

# /stage-start — Stage 진입

사용 형식: `/stage-start {0|1|2} [feat-name]`

`$ARGUMENTS` 가 raw 인자다(아래 처리 절차 1단계에서 즉시 파싱).

## 처리 절차

1. `$ARGUMENTS` 를 `.claude-context/design-rule.md` §2.3 입력 파싱 규칙에 따라 `{stage_number}` / `{feat-name}` 으로 분해·정규화한다.
2. `.claude-context/design-rule.md` 를 `Read` 로 로드해 §3(Stage 정의)·§4.1(이전 Stage 자동 복원)·§4.3(모드 정책) 규칙을 따른다.
3. 동일 feat의 기존 산출물(`docs/spec/{feat-name}_s*.md`)을 점검 후 §4.1 절차대로 복원/경고/진행 여부를 사용자와 합의한다.
4. **계획 모드로 진입**해 대화를 시작한다(§4.3 기본값). 첫 응답에 모드 진입 사실과 허용·금지 도구 요지를 한 줄로 명시한다.
5. 계획 모드 동안에는 §4.3 "수락 확인 생략 원칙" 에 따라 단계별 진행 동의("여기까지 OK?" 등)를 묻지 않고 stage 작업을 연속 수행한다. **수락은 `/stage-end` 가 일괄 대체**한다.
6. `Write`/`Edit`/상태 변경 `Bash`/커밋·푸시 등 편집 작업은 §4.3 전환 트리거(사용자 명시 요청 또는 `/stage-end`) 가 발생한 뒤에만 수행한다.
7. **`/stage-end` 또는 plan 승인 = 산출 문서 저장 신호일 뿐, 코드 구현 시작 신호가 아니다**(§4.3 "구현 작업 범위 — 명시 요청 한정"). 실제 소스 변경은 `"이제 구현 시작"` / `/harness-start` 같은 사용자 명시 요청이 있을 때만 진입한다.

세부 규칙(Stage별 기대 산출물, 코드 금지, 확인 필요 항목, 모드 전환 트리거 등)은 모두 `.claude-context/design-rule.md` 단일 소스를 따른다.

## 예시
- `/stage-start 0 new-dashboard`
- `/stage-start 1 fever-time`
- `/stage-start 2 rebirth-v2`

$ARGUMENTS
