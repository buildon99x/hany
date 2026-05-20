# Session Efficiency Metrics

> Append-only run log. Each invocation adds a new `## Run …` section; never overwrites.

## Run 2026-05-04T05:21:45Z

- Session: `multi(2)`
- Branch: `claude/session-efficiency-metrics-idF2Q`
- Input: `scripts/lib/__fixtures__`

| KPI | Value | Threshold |
|---|---|---|
| R (combined) | 0.40 | >=0.10 warn |
| R_compile | 0.00 | >=0.10 warn |
| R_reedit | 0.67 | >=0.10 warn |
| C (PreCompact) | 1 | >=3 warn |
| F_privacy | 2 | label later |
| F_bash | 1 | label later |
| P (process) | 0.58 | >=0.70 ok |
| H (handoff) | 0.33 | >=0.80 ok |

### Warnings
- warn: R
- warn: R_e
- warn: P
- warn: H

### Noise
- parse failures: 0
- unknown fields: 1 (first: `type:window_focus`)
- empty lines: 0

### Recommendations
- compile-error 재발 시그니처가 임계 초과 — 재현 케이스 정리 후 근본 원인 추적.
- 같은 파일/위치 재편집이 임계 초과 — 한 번에 끝내는 패치로 재시도 줄이기.
- Process 산출물(s0/s1/s2/ledger) 누락 — 누락 task 식별 후 보완.
- Handoff 산출물(quality_note/data_inventory/retrospective) 누락 — Medium+ 작업 사후 보완.
