# Data Inventory: session-efficiency-metrics (delta-only)

> Delta against `DATA_INVENTORY_TEMPLATE.md`. The analyzer is read-only over Claude Code transcripts and writes a Markdown report carrying meta-only counters; no new persisted schema, no telemetry upload.

## Data Item
- Name: Session Efficiency Metrics report
- Feature: session-efficiency-metrics (post-hoc analyzer)
- Purpose: 사후 KPI(R/C/F/P/H) 가시화 — 다음 사이클 결정 입력
- Required for core value: No (운영 가시성 한정, 차단 게이트 없음)
- Data category: Aggregate (counts) + Derived (sha256 hashes, basenames)

## Collection
- Source: `%USERPROFILE%\.claude\projects\<repo-hash>\*.jsonl` (수기 트리거, 자동 수집 0)
- Collection timing: `npm run analyze-session` 명시 호출 시점만
- User-visible explanation: README → `docs/spec/session-efficiency-metrics_s{0,1,2}.md`
- Permission required: 추가 권한 0 (로컬 read 전용)
- Raw input present: No — 어댑터 경계에서 prompt/tool_input/file content/bash command/window title/coords 폐기
- Aggregation granularity: 카운트(정수) + 비율(소수 2자리)
- Minimum bucket size: 1 (분모 0 시 `N/A` 출력)
- Per-app or per-window breakdown present: No
- Re-identification risk: Low — 보고서 진입 데이터는 카운트·basename·12자 해시뿐

## Storage
- Stored locally: `docs/harness/session_metrics_<YYYY-MM-DD>.md` (git 추적, append-only)
- Stored remotely: No
- Path or table: 위와 동일, 새 영속 스키마 0
- Retention: 사용자 자율(repo 보존). 자동 삭제 0
- Deletion path: `git rm` 또는 직접 삭제
- Encryption or protection: repo-level (git remote ACL); 본 분석기는 추가 암호화 없음

## Privacy Constraints
- Keyboard raw values stored: No
- Typed strings stored: No
- Mouse coordinates or cursor paths stored: No
- Window title or app-specific input content stored: No
- Screenshots or user-content artifacts stored: No
- Per-second activity timeline stored: No
- Per-application activity timeline stored: No

## Validation
- Privacy scrubber command: `npm run analyze-session -- --check`
- Schema denylist result: scrubber 의 `assertNoSentinels` 가 `__SECRET_PROMPT__` / `__SECRET_CMD__` / `__SECRET_FILE__` / `__SECRET_TITLE__` 및 좌표 sentinel(`123456`/`789012`) 0회 통과 검증
- Log/artifact scan result: `grep -cE '__SECRET_*|123456|789012'` 보고서 0건 (Step F 검증)
- Aggregation review result: 어댑터 출력 ≤ scrubber allowlist 11필드(kind / ts_ms / tool_name / hook_name / decision / target_path / target_depth / error_code / error_hash / pos_hash / bytes / is_error / session_id8 / transcript_id) — 본문·좌표·창 제목 항목 0
- Reviewer: 본 PR 셀프리뷰 + 사용자 머지 검토
