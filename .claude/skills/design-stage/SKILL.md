---
name: design-stage
description: Stage 기반 설계 워크플로우 (Stage 0 아이데이션 → 1 기능 설계 → 2 구현 계획). /stage-start · /stage-end 슬래시 명령 또는 한국어 자연어 트리거로 인보크. 산출물은 docs/feat_{name}_s{N}.md 에 저장.
---

# /design-stage — Stage 기반 설계 워크플로우

기능 제안·설계를 "Stage 0 아이데이션 → Stage 1 기능 설계 → Stage 2 구현 계획"의 3단계로 진행하고, 각 단계 산출물을 `docs/feat_{feat-name}_s{N}.md`로 저장한다.

## 발동 조건
사용자 메시지가 다음 중 하나에 해당할 때 본 스킬을 인보크한다.

- `stage-start {0|1|2}` 또는 `stage-start {0|1|2} {feat-name}` 패턴 포함(대시/공백 변형 허용).
- `stage-end {0|1|2}` 패턴 포함.
- 한국어 자연어: "Stage {N} 시작", "Stage {N} 진행", "Stage {N} 저장", "다음 Stage로", "이제 구현 진행".

이미 활성화된 세션에서는 중복 인보크하지 않는다.

## 단일 소스
모든 절차(입력 파싱, Stage별 산출물 규약, 이전 Stage 자동 복원, 종료 게이트, 덮어쓰기 가드, 저장·커밋·`/compact` 흐름, push 정책)는 `.claude-context/design-rule.md` 를 따른다. **본 스킬은 절차 본문을 중복 기재하지 않는다.**

## 실행 절차

1. `.claude-context/design-rule.md` 를 `Read` 로 로드.
2. 사용자 메시지에서 인자 추출 → §2.3 입력 파싱.
3. 진입 신호면 §3·§4.1 (Stage 정의 + 자동 복원) + §4.3 (모드 정책 — 계획 모드 기본 진입) 적용.
4. 종료 신호면 §4.3 전환 트리거에 따라 편집 모드로 전환한 뒤 §5 (게이트 → 덮어쓰기 가드 → 저장·커밋·`/compact`) 적용.

## 슬래시 커맨드와의 관계
`/stage-start`, `/stage-end` 와 완전히 동일한 플로우. 슬래시 커맨드 진입과 자연어 진입의 동작이 달라서는 안 된다.

## 주의
- `CLAUDE.md` "Planning Rules"(코드 금지, 1~2줄 요약)는 Stage 1·2 동안 항상 활성.
- `docs/.archive` 는 읽기 금지(프로젝트 설정 준수).
