---
description: Staged planning workflow — Stage 종료 및 문서 저장
---

# /stage-end — Stage 종료 및 저장

사용 형식: `/stage-end {0|1|2} [feat-name]`

`$ARGUMENTS` 가 raw 인자다(아래 처리 절차 1단계에서 즉시 파싱).

## 처리 절차

1. `$ARGUMENTS` 를 `.claude/skills/design-stage/SKILL.md` §2.3 입력 파싱 규칙에 따라 `{stage_number}` / `{feat-name}` 으로 분해·정규화한다.
2. `.claude/skills/design-stage/SKILL.md` 를 `Read` 로 로드해 §5(저장 규칙) 전체를 따른다.
3. **종료 게이트(§5.2)** — Stage 1·2 인 경우 확인 필요 항목 합의 여부를 점검하고, 미합의 항목은 다시 제시해 결정을 받는다. Stage 2 는 `_s1.md` 존재도 함께 확인.
4. 현재 Stage 대화를 §5.1 헤더 규약에 맞춰 마크다운 초안으로 정리하고 사용자에게 검토 요청.
5. **덮어쓰기 가드(§5.3)** — 대상 경로 `docs/spec/{feat-name}_s{stage_number}.md` 가 이미 존재하면 덮어쓰기/다른 이름/취소를 묻는다.
6. **기본 액션(§5.4)** — 사용자 승인 → `Write` 저장 → 해당 문서 단일 파일 스테이징 → `git commit` (`docs({feat-name}): Stage {stage_number} {요약}`) → `/compact` 호출. 사용자가 거부하면 커밋·`/compact` 단계는 건너뛴다. push 는 사용자 명시 요청 시에만.
7. 저장·커밋 완료 후 다음 Stage 진행 여부를 묻는다.

세부 규칙은 모두 `.claude/skills/design-stage/SKILL.md` 단일 소스를 따른다.

## 예시
- `/stage-end 1 fever-time` → `docs/spec/fever-time_s1.md` 저장 + 커밋 + `/compact`
- `/stage-end 2` → feat-name 확인 후 `docs/spec/{feat-name}_s2.md` 저장 (Stage 1 문서 존재 확인 포함)

$ARGUMENTS
