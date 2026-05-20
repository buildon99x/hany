# Feature Quality Note — auto-skill-activation-level-up (hot-fix #3: per-10-level SP)

> Scope: SP 획득 방식을 rebirth-only 에서 **10 레벨당 +1 SP** 로 단순화.
> Prior hot-fixes: #1 (PalettePage threshold), #2 (brush apply + cache refresh + startup save + version bump), #3 (reset_skills_in_place ASA fields + frontend skill cache).

## Feature
- Name: auto-skill-activation-level-up — SP economy hot-fix
- Related request: 사용자 지시 "SP 획득 방식을 단순하게 10레벨당 1 SP를 획득하도록 수정한다."
- Related ADR: 본 Ledger Decision Log 의 후속 (#15: SP economy switch).
- Quality gate matrix: `docs/harness/QUALITY_GATE_MATRIX.md` — persisted-schema-touch ❌ (constant change only, schema 동일), recovery/migration evidence ✅ (no migration needed — derived value), privacy ✅ (aggregate-only), lifecycle ✅ (no new timers/listeners).
- Data inventory: 변경 없음 (`skill_points: u32` 필드 그대로, 의미는 기존 = 누적 SP).
- Difficulty tier: **Low** (constant flip + 1 loop hook + i18n key swap).
- Tier rationale: 4 파일 변경, 신규 영속 필드 0, 신규 IPC 0, 신규 이벤트 0, 신규 의존성 0. 게이트 1회 통과.
- Tier changes during implementation: 없음.

## Requirement Evidence
| Acceptance case | Evidence | Result |
| --- | --- | --- |
| 10 레벨 도달 시 +1 SP | `input.rs::process_accepted_input` per-level loop 에서 `current_level % SP_PER_LEVEL_INTERVAL == 0` 조건 충족 시 `sp_gained_this_batch += 1` 누적, batch 종료 후 `skill_points += sp_gained_this_batch` | ✅ |
| 멀티-레벨 batch 시 milestone 중복 카운트 | per-level 루프 안에서 검사하므로 (예: 9→11 두 단계 batch) level=10 통과 시 1회만 카운트 | ✅ |
| Rebirth 시 SP 무지급 (단순화) | `REBIRTH_SP_REWARD = 0`. `stats.rs::rebirth` 의 `+= 0` no-op | ✅ |
| 신규 설치 시 INITIAL_SKILL_POINTS = 1 보존 | `models.rs:319` 변경 없음. Startup trigger 즉시 cartoon_brush 활성화 (B-addendum 흐름 유지) | ✅ |
| ASA 즉시 진행 | `sp_gained_this_batch > 0` 일 때 `try_advance_auto_skill(app_handle, &mut s)` 호출 | ✅ |
| 단위 테스트 통과 | `sp_economy_constants` 테스트 갱신 (REBIRTH=0, INITIAL=1, INTERVAL=10) | ✅ 72 passed |
| 프론트엔드 i18n | ko/en 양쪽 `rust.input.event.sp_milestone` 추가, `rust.stats.event.rebirth` 의 `{sp}` 플레이스홀더 제거 | ✅ i18n:validate strict 모드 통과 |

## UI/UX Evidence
- Reviewed checklist: 본 변경은 backend 경제 모델 변경 + 이벤트 로그 메시지 변경만. UI 시각 변화 없음 — 기존 ASA 토스트·배지·locked-card 흐름 그대로.
- States covered: (1) 정상 level-up at multiples of 10 → SP 증가 + ASA advance + 토스트. (2) batch level-up (9→11) → milestone 1회 발화. (3) ASA 모드 off → SP 만 증가, advance 없음. (4) rebirth → SP 변동 없음 + 이벤트 로그 "환생 #N 달성".
- User-facing copy changes: 2 i18n 키 변경 (ko/en).
- Accessibility notes: 이벤트 로그 항목은 기존 dashboard event log 통해 표시 — 별도 aria 변경 불필요.
- Remaining UX risk: SP 획득 알림이 dashboard event log 외에는 없음 — 별도 토스트 필요 여부 사용자 확인 후속 작업 가능.

## Resident Stability Evidence
- Lifecycle cleanup checked: 신규 timer/listener 0. ASA 호출은 동일 사이트 (caller-locked, lock 즉시 해제).
- Background/resume checked: 변경 없음 (input event flow 안에서만 동작).
- Sleep/wake checked: 동일 (input event 가 발생해야 SP 가산되는 구조 — sleep 중에는 작동 안 함, wake 후 자연 재개).
- Soak or sampler evidence: cargo test loop `try_advance_auto_skill_budget_cap` 등 ASA 무한 루프 방어 테스트가 그대로 통과.
- Remaining stability risk: `saturating_add` 사용으로 u32 overflow 보호 — 22 rebirth 모두 통과 시 누적 SP 약 2,659 (≪ u32 max).

## Recovery and Data Integrity Evidence
- Degraded mode: 본 변경은 derived-field semantics 만 변경 — state.json schema 변경 0. 기존 사용자의 `skill_points` 값은 그대로 보존되며 의미는 동일 (누적 SP).
- Retry or pause path: 해당 없음 (단일 atomic mutation).
- Restart/interrupted-write evidence: `save_state_debounced` 가 기존 `if level_ups > 0` 블록 내에서 호출 — SP 증가 + ASA advance 모두 같은 락 임계영역에서 처리 후 debounce save 큐로 진입. 인터럽트 시 다음 input event 에서 재시도.
- Migration or rollback evidence: **migration 불필요** — 상수 값만 변경. 기존 사용자의 영속 데이터는 그대로 유효. `AUTO_SKILL_SEQUENCE_VERSION` bump 없음 (시퀀스 자체는 미변경). 롤백 = 상수 원복 + i18n 원복 (영속 데이터 호환 100%).
- Double-counting prevention: 밀스톤 카운트는 `current_level % SP_PER_LEVEL_INTERVAL == 0` 조건 하나 — per-level 루프가 단조 증가 (`level += 1`)이므로 동일 레벨 재트리거 불가.

## Old/New/Corrupt/Missing-field Evidence
- **Old (pre-hot-fix) 사용자**: `skill_points` 필드는 기존부터 존재. 값 보존. 이전 rebirth bonus 로 적립된 SP 는 그대로 사용 가능.
- **New (fresh install) 사용자**: INITIAL_SKILL_POINTS=1 → startup trigger → cartoon_brush 활성화. 이후 level 10 도달 시 +1 SP → kb_efficiency 활성화. 정상.
- **Corrupt 사용자**: `skill_points` 가 비정상 값(예: u32 max) 이어도 `saturating_add` 로 보호. ASA 가 SP 가 있을 때까지만 advance.
- **Missing-field**: `skill_points` 는 `#[serde(default)]` 로 0 fallback (기존 동작). REWARD/INTERVAL 은 상수이므로 missing 개념 없음.

## Privacy Evidence
- Data collected: 변경 없음 (aggregate only — level count, skill_points 합계).
- Aggregation level: 동일 (per-skill level, total SP, no per-keystroke).
- Raw input fields present: No.
- Privacy scrubber result: i18n 메시지에 raw 입력 0. 이벤트 로그 항목은 level 숫자 + SP 숫자만.
- Retention/deletion documented: `reset_storage` 가 SP 도 함께 0 으로 리셋 (hot-fix #2 에서 ASA 필드 포함 완전 reset 보장).

## Security and Environment Evidence
- Secret/path/token scrub result: N/A — 상수 변경만.
- External dependency or hook trust review: 신규 의존성 0.
- Offline/online, battery, display, timezone, or locale evidence: locale 의존 없음 (숫자만). i18n ko/en 양쪽 갱신.
- Accessibility or time-semantics notes: SP 적립 시점이 level-up 직후 — 시간 의존 없음.

## Operations
- Failure artifacts: 없음 (loop budget 사용 0).
- Rollback or mitigation: 상수 3개 + i18n 키 2개 원복 + input.rs 의 sp_gained_this_batch 블록 제거 + stats.rs 의 placeholder 복원. 4 파일 revert.
- Pause point: 해당 없음.
- Follow-up: (1) SP 증가 시 토스트 알림 필요 여부 사용자 확인. (2) dev_force_rebirth 의 `+= REWARD` (now 0) 도 동일 흐름이라 변경 없음 — 향후 dev 도구 정리 시 명시화 권장.
- Deferred evidence expiry: 해당 없음.

## Stop Conditions Hit
- Trigger: 없음.
- Decision: N/A.
- Owner of follow-up: N/A.

## Gates Summary

| Gate | Result |
| --- | --- |
| `cargo fmt` | ✅ |
| `cargo clippy --all-targets -- -D warnings` | ✅ (vendor/rdev 3 warnings 만 — 허용된 예외) |
| `cargo test --lib` | ✅ 72 passed / 0 failed |
| `npm run typecheck` | ✅ |
| `npm test` | ✅ 19 passed / 0 failed |
| `npm run i18n:validate` | ✅ strict 통과 (736 keys aligned, 기존 warning 만 잔존) |

## Commits

| 커밋 | 설명 |
| --- | --- |
| (this commit, post-write) | feat(sp): per-10-level SP grant replaces rebirth bonus + i18n |

Branch: `claude/auto-skill-activation-levelup-b37gz`
