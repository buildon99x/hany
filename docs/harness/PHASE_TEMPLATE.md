---
role: behavior
portability: portable
supersedes:
  - QUALITY_GATE_MATRIX.md
  - WORK_STATUS_TEMPLATE.md
---

# Phase Template — 피처 진행 중 사용

피처 작업 진입 시 `docs/feat_{name}_phase.md` 로 복사. Gate Matrix 는 Phase 시작 시 1회 채움, Work Status 는 루프마다 갱신.

> 핸드오프(PR/완료) 시점은 `HANDOFF_TEMPLATE.md` 사용.

---

## 1. Feature Summary
- Feature:
- Owner:
- Related issue or request:
- Related ADR:
- Target release:
- Difficulty tier: Low / Medium / High
- Tier rationale:

## 2. Gate Matrix
| Gate | Run stage | Blocking mode | Required evidence | Minimum bar | Artifact |
| --- | --- | --- | --- | --- | --- |
| Requirement correctness | PR | Blocking | Acceptance cases mapped to tests | All must pass | Test report, Feature Quality Note |
| UI/UX consistency | PR | Blocking for user-facing changes | Required UI states reviewed | Default/loading/empty/error/disabled/permission/success covered | Design checklist |
| Responsiveness | PR/Nightly | Blocking when touched path affects input/rendering | Latency and frame metrics | P95 input latency < 120ms, frame drop < 1% | UX metrics JSON |
| Resident lifecycle | PR | Blocking when timers/listeners/workers/subscriptions/caches change | Cleanup and duplicate-registration evidence | No leaked or duplicated lifecycle resource | Focused lifecycle test |
| Resident soak | Nightly/Weekly | Release blocking | Soak evidence | CPU/memory/handle/timer/log growth within limits | Soak report |
| Privacy | PR | Always blocking | Aggregate-only input data and scrubbed artifacts | Raw input fields 0 | Privacy scan report |
| Operability | PR | Blocking for harness changes | Failure artifact and status snapshot | Repro command and next action present | Work status snapshot |
| Recovery and degraded mode | PR/Nightly | Blocking when persistence/background work is touched | Restart, retry, interrupted-write, stale-cache evidence | No duplicate work, data loss, or unexplained stuck state | Recovery test report |
| Data integrity and migration | PR/Release | Blocking when persisted schema changes | Old/new/corrupt/missing-field cases | Compatible migration or documented rollback | Migration report |
| Harness trustworthiness | PR for harness changes | Blocking for new gates | Negative sample or known-failing fixture | Gate fails for the intended reason | Gate calibration artifact |
| Desktop environment variance | Nightly/Weekly | Release blocking when relevant | Battery saver, offline/online, locale/timezone, display changes | Behavior remains explainable and within SLO | Platform matrix report |
| Security boundary | PR | Blocking when hooks, reports, IPC, plugins, updater, or exports change | Secret/path/token scrub and trust review | No secret, token, private path, or untrusted execution path | Security review note |
| Style lint (CSS) | PR + Baseline | Advisory until Phase F (≥30 days clean) → blocking | `npm run lint:css` passing on changed `src/styles/**/*.css` | 0 violations | CI `stylelint` job log |

> 티어별 게이트 적용 표는 `FEATURE_DIFFICULTY_TIERS.md` 참조. 본 표는 전체 게이트 마스터 리스트.

## 3. Tier-Adjusted Scope
- Low tier gates included:
- Medium tier gates included:
- High tier gates included:
- Gates intentionally deferred:
- Reason for deferral:

## 4. Acceptance Trace
| Acceptance case | Test level | Test or command | Evidence path | Status |
| --- | --- | --- | --- | --- |
| Given / When / Then | Unit / Contract / E2E / Soak / Privacy |  |  | Planned |

## 5. Risk Register
| Risk | User impact | Detection | Mitigation | Owner |
| --- | --- | --- | --- | --- |
|  | High / Med / Low |  |  |  |

## 6. Additional Perspective Check
| Perspective | Applies? | Evidence or reason not applicable |
| --- | --- | --- |
| Recovery/degraded mode | Yes / No |  |
| Data integrity/migration | Yes / No |  |
| Harness trust/negative sample | Yes / No |  |
| Desktop environment variance | Yes / No |  |
| Security boundary | Yes / No |  |
| Accessibility/locale/time semantics | Yes / No |  |
| Operational ownership/expiry | Yes / No |  |

## 7. Evidence Paths
- Feature Quality Note (handoff):
- Design checklist:
- Data inventory:
- Metrics or report directory:
- Recovery or migration evidence:
- Gate calibration evidence:
- Security review note:

---

## 8. Work Status Snapshot (live-update)

루프마다 갱신 — Claude Code 세션 종료/압축, 사용자 중단, 장시간 작업 시 1분 안에 현재 상태 파악 가능해야.

- Goal:
- Current Step:
- Current Zone: Design Zone / Execution Zone
- Ledger Path: `docs/feat_{name}_harness_ledger.md` (또는 N/A)
- Changed Files:
- Commands Run:
- Evidence:
- Blockers:
- Next Action:
- Pause Point:

### 8-1. Loop Budget
- Same failure auto-fix attempts: 0 / 3
- Same test reruns without code/input change: 0 / 2
- Same-line rewrites:
- Current hypothesis:
- Stop condition:

### 8-2. User Interruption Summary (중단 발생 시)
- Running work to stop:
- Files touched by this session:
- Artifacts to preserve:
- User changes not to revert:
- Safe resume command or next step:
