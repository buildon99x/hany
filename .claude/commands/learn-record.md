---
description: 방금 작업의 실수를 docs/learn/ 에 회고로 기록
---

# /learn-record — 실수 회고 기록

사용 형식: `/learn-record [slug-hint]`

`$ARGUMENTS` 는 선택적 슬러그 힌트(kebab-case). 비면 대화 컨텍스트에서 추출 후 1줄 제안한다.

## 처리 절차

1. `.claude/skills/learn-record.md` 를 `Read` 로 로드.
2. 스킬의 "실행 절차" 1–5 단계를 그대로 수행한다.
3. 산출 파일: `docs/learn/lesson_{YYYY-MM-DD}_{slug}.md` + `docs/learn/README.md` 색인 1행 추가.
4. 저장 전 사용자에게 슬러그·메타·6 섹션 초안을 1회 보여주고 확인을 받는다(무확인 저장 금지).
5. 커밋·푸시는 사용자가 명시 요청한 경우에만.

세부 규약(섹션 구조, 작성 원칙, 안티패턴 형식)은 모두 `.claude/skills/learn-record.md` 단일 소스를 따른다.

## 예시
- `/learn-record`
- `/learn-record frontend-cache-overrides-backend-reset`
- `/learn-record debounced-timer-survives-invalidate`

$ARGUMENTS
