---
name: harness-loop
description: GitHub Issue 큐 기반 자율 워크 사이클 — Producer → Dispatcher → Worker → Reviewer → Closer → Reporter. /harness-loop 슬래시 명령 전용 — 자연어로 자동 발동하지 않음 (자율 실행 안전장치).
---

# /harness-loop — GitHub Issue 큐 자율 워크 사이클

본 SKILL 은 인보크 진입점 정의만 담당한다. 절차 본문은 `.claude/commands/harness-loop.md` 에 단일 소스로 유지한다.

## 발동 조건

- 슬래시 명령: `/harness-loop` (사용자 명시 호출 한정).
- 자연어 트리거 **금지** — autonomous 워크플로우는 사용자 의도 추정 위험 (의도치 않은 PR 생성·머지 발생 가능).

## 처리 절차

`.claude/commands/harness-loop.md` 를 참조 — Producer/Dispatcher/Worker/Reviewer/Closer/Reporter 6단계 사이클 본문 + Startup Gate (Config 로드 · main branch protection · GitHub MCP 가용성) 정의.

## 연동 파일

- `.claude/commands/harness-loop.md` — 절차 본문 단일 소스.
- `harness-loop.config.json` — 사이클 config (loop_budget · required_docs · strict_mode_default · staged_mode 등).
- `docs/harness/HARNESS_LOOP_DASHBOARD.md`, `HARNESS_LOOP_ISSUE_FILTERING.md` — 운영 가이드.
