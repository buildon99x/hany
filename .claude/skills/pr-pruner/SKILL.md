---
name: pr-pruner
description: PR 정리 자동화 — buildon99x/pixel-horizon 저장소의 열린 PR 점검 및 정리. /pr-pruner 슬래시 명령으로 인보크.
---

# /pr-pruner — PR 정리 자동화

`buildon99x/pixel-horizon` 저장소의 PR을 점검하고 정리합니다.

## 실행 절차

### 1. PR 목록 조회
`mcp__github__list_pull_requests`로 열린 PR 전체를 가져온다.
- `state: "open"`, `per_page: 50`

### 2. 각 PR 상태 분류

아래 기준으로 각 PR을 분류한다:

| 분류 | 조건 |
|------|------|
| **stale** | 마지막 업데이트(`updated_at`)가 **14일 이상** 경과 |
| **merged-branch** | 이미 merge된 PR의 head 브랜치가 삭제되지 않고 남은 경우 |
| **draft** | draft 상태이고 **30일 이상** 업데이트 없음 |
| **healthy** | 위 조건에 해당하지 않음 |

### 3. 분류별 처리

#### stale PR
- `mcp__github__add_issue_comment`로 아래 메시지를 코멘트한다:
  ```
  👋 이 PR은 14일 이상 업데이트가 없습니다.
  작업을 계속 진행하실 예정이라면 상태를 업데이트해 주세요.
  7일 내 활동이 없으면 자동으로 닫힐 수 있습니다.
  ```
- 이미 동일한 stale 코멘트가 있으면 중복 코멘트하지 않는다.

#### draft + 30일 이상 미업데이트
- `mcp__github__add_issue_comment`로 아래 메시지를 코멘트한다:
  ```
  📝 이 Draft PR은 30일 이상 업데이트가 없습니다.
  진행할 예정이 없다면 닫아주세요.
  ```
- 이미 동일한 코멘트가 있으면 스킵.

#### merged-branch
- 현재 claude-code 환경에서는 브랜치 삭제 권한이 없으므로 **코멘트만** 남긴다:
  ```
  🌿 이 PR의 head 브랜치가 아직 삭제되지 않았습니다. 정리를 권장합니다.
  ```

### 4. 결과 리포트

처리 완료 후 다음 형식으로 요약을 출력한다:

```
## PR Pruner 결과 — {날짜}

| 상태 | 건수 |
|------|------|
| healthy | N |
| stale (코멘트 완료) | N |
| stale (이미 코멘트됨, 스킵) | N |
| draft stale (코멘트 완료) | N |
| merged-branch (코멘트 완료) | N |

### 조치한 PR 목록
- #{번호} {제목} — {조치 내용}
```

## 주의사항
- **절대 PR을 닫거나 merge하지 않는다.** 코멘트만 남긴다.
- 같은 PR에 같은 종류의 코멘트가 이미 있으면 중복 코멘트하지 않는다.
- `buildon99x/pixel-horizon` 저장소만 대상으로 한다.
