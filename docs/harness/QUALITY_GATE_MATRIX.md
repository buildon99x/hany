---
role: behavior
portability: portable
deprecated: see PHASE_TEMPLATE.md (§1–§7)
---

> **DEPRECATED** — 신규 피처는 `PHASE_TEMPLATE.md` 사용. 본 파일은 기존 ledger 참조 호환을 위해 유지. 게이트 마스터 리스트의 단일 진실값은 PHASE_TEMPLATE.md §2.

# Quality Gate Matrix

This matrix connects feature requirements to UX, resident stability, privacy, and evidence. Every feature should fill this before implementation starts and update it before review.

## Feature Summary
- Feature:
- Owner:
- Related issue or request:
- Related ADR:
- Target release:
- Difficulty tier: Low / Medium / High
- Tier rationale:

## Gate Matrix
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

## Gate-by-Tier Lookup
Derived from `docs/harness/FEATURE_DIFFICULTY_TIERS.md` "Required Evidence by Tier". Use this as a starting point; record any deviation in the per-feature "Tier-Adjusted Scope" below.

| Gate | Low | Medium | High |
| --- | --- | --- | --- |
| Requirement correctness | Required (focused acceptance cases) | Required | Required (full acceptance + edge paths) |
| UI/UX consistency | If user-facing copy/state changed | Required for user-facing flow | Required + UX risk review |
| Responsiveness | Not required | If touched path affects input/render | Required if touched + nightly metrics |
| Resident lifecycle | If lifecycle resource touched | If lifecycle resource touched | Required |
| Resident soak | Not required | Nightly if lifecycle/background touched | Nightly + weekly, release-blocking |
| Privacy | Always (touched artifacts) | Always | Always blocking |
| Operability | If harness gate or status changed | Required | Required |
| Recovery / degraded mode | If persistence or background touched | Required when persistence/background touched | Required |
| Data integrity / migration | If schema touched | If schema touched | Required for persisted schema changes |
| Harness trustworthiness | If a harness gate changed | If a harness gate changed | Required for new blocking gates |
| Desktop env variance | Not required | If touched path is environment-sensitive | Release-blocking nightly/weekly |
| Security boundary | If reports/hooks/exports/IPC/updater touched | Required when touched | Required |
| Style lint (CSS) | If `src/styles/**` touched | If `src/styles/**` touched | If `src/styles/**` touched |

## Tier-Adjusted Scope
Per-feature decision after reading the lookup above.

- Low tier gates included:
- Medium tier gates included:
- High tier gates included:
- Gates intentionally deferred:
- Reason for deferral:

## Acceptance Trace
| Acceptance case | Test level | Test or command | Evidence path | Status |
| --- | --- | --- | --- | --- |
| Given / When / Then | Unit / Contract / E2E / Soak / Privacy |  |  | Planned |

## Risk Register
| Risk | User impact | Detection | Mitigation | Owner |
| --- | --- | --- | --- | --- |
|  | High / Med / Low |  |  |  |

## Additional Perspective Check
| Perspective | Applies? | Evidence or reason not applicable |
| --- | --- | --- |
| Recovery/degraded mode | Yes / No |  |
| Data integrity/migration | Yes / No |  |
| Harness trust/negative sample | Yes / No |  |
| Desktop environment variance | Yes / No |  |
| Security boundary | Yes / No |  |
| Accessibility/locale/time semantics | Yes / No |  |
| Operational ownership/expiry | Yes / No |  |

## Evidence Paths
- Feature Quality Note:
- Design checklist:
- Data inventory:
- Work status snapshot:
- Metrics or report directory:
- Recovery or migration evidence:
- Gate calibration evidence:
- Security review note:

## Exit Summary
- Passed gates:
- Deferred risks:
- User-visible changes:
- Rollback or mitigation:
- Deferred evidence expiry:
