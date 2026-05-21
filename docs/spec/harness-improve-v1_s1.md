---
kind: feat
name: harness-improve-v1
stage: 1
status: active
---

# Harness Improve v1 — Stage 1 SUBAGENT_DELEGATION_GUIDE 기반 advisory 게이트화

> 이전 Stage 문서: 해당 없음 (`harness-improvements_s0.md` 는 별도 feat — Core/Layer 분리 이데이션).
> 출처: `docs/harness/SUBAGENT_DELEGATION_GUIDE.md` §2 비용 분석.

## 1. 컨셉

`spec-doc-management` retrospective 에서 식별된 상위 2개 비용 원인 (사전 grep 누락 / 도구 미스매치) 만 advisory 게이트로 정착. `design-rule.md` §6 Footnote 4 신설 — Footnote 1·2·3 패턴 (placeholder 발효일 + 30일 advisory + 발동 카운트 분기) 동일 적용. 차단 게이트 승격 금지.

제외된 원칙: G3 권한 보호 파일 식별 (CLAUDE.md 1건 — advisory 룰 비용 > 절감), G4 self-application grandfathered (1회성 — retrospective 메모로 충분).

## 2. 개선 게이트 (2종)

| # | 원칙 | advisory 게이트 | 발동 태그 | 예상 절감 |
|---|---|---|---|---|
| G1 | 사전 grep 의무화 | s1 §영향 파일 표 작성 시 `grep -rl '<패턴>'` 결과 인용 컬럼 (또는 §Scope 메모) | `[pre-grep-trigger]` | 영향 파일 표 정확도 ↑ — Phase 재작업 회피 (사례: Phase B 추가 13파일 발견 → 0건 목표) |
| G2 | 위임 방식 2분기 명시 | s2 Phase Contract 서브에이전트 스코프 첫 줄: `mode: subagent` / `mode: main-batch` (sed/awk 일괄 치환 + 1~2 파일 메인 Edit 포함) | `[delegation-mode-trigger]` | 단순 치환에 subagent 남용 회피 — Tool 호출 50~70% ↓ |

## 3. 영향 파일 표

| # | 파일 | 변경 요지 | 전제조건 | file:line |
|---|---|---|---|---|
| 1 | `.claude-context/design-rule.md` | §3 의무 산출물 표 영향파일 행 우측 "사전 grep" 권장 1줄 추가; §5.4 위임 임계 OR 4중 아래 "위임 방식 2분기 명시" 1줄 추가; §6 Footnote 4 신설 (G1·G2 묶음, Footnote 3 패턴 그대로) | Footnote 1·2·3 placeholder 패턴 일관 | `multi` (§3:87 / §5.4:184 / §6:259) |
| 2 | `.claude/skills/harness-entry/SKILL.md` | Readiness Validation item 6 — `[pre-grep-trigger]` 회피용 s1 영향 파일 표 grep 인용 컬럼 advisory; item 7 — s2 서브에이전트 스코프 `mode:` prefix grep advisory | item 5 직후 패턴 | `harness-entry/SKILL.md:24` |
| 3 | `docs/harness/HARNESS_OPERATING_PLAYBOOK.md` | line 122 인근 advisory 요약 묶음에 G1·G2 1~2줄 추가 (Footnote 3 요약 형식 일관) | Footnote 3 요약 패턴 | `HARNESS_OPERATING_PLAYBOOK.md:122` |
| 4 | `docs/harness/CLAUDE_CODE_HARNESS_APPLY.md` | 포팅 가이드 advisory 게이트 항목에 G1·G2 추가 | 4중 동기 의무 | `extern:CLAUDE_CODE_HARNESS_APPLY` |
| 5 | `docs/harness/SUBAGENT_DELEGATION_GUIDE.md` | 서두에 "본 문서는 design-rule §6 Footnote 4 출처" 1줄 + 발효일 placeholder 참조 1줄 | 본문 §1~7 유지 | `SUBAGENT_DELEGATION_GUIDE.md:5` |

> 영향 파일 5개 ≥ 4 → §5.4 위임 임계 충족 → s2 에서 ≥2 Phase 분할 권장.

## 4. Context Carry

| # | 결정 | 기각 옵션 | 기각 사유 |
|---|---|---|---|
| 1 | §6 Footnote 4 **신설** (G1·G2 묶음) | Footnote 2 (retrospective base) 에 통합 | Footnote 2 의 30일 freeze 권장 충돌; 발효일 별도 관리 필요 |
| 2 | 위임 방식 **2분기** (`subagent` / `main-batch`) | 3분기 (subagent / main-sed / main-direct) | G3 권한 파일 제외에 따라 분기 단순화 — main-direct 와 main-batch 구분 실익 작음 |
| 3 | **G1·G2 만 채택** (G3·G4 제외) | 4원칙 전부 advisory 게이트화 | G3 (CLAUDE.md 1건) · G4 (self-application 1회성) 는 advisory 룰 추가 비용 > 절감분 |
| 4 | tier 적용 = **Medium+ 의무** (Low 면제) | All tier (위임 타입 기준 — Footnote 3 패턴) | Low 는 영향 파일 표 자체 면제 — G1 자동 면제; G2 는 Phase Contract 의무 산출물과 정합 |

## 5. ATK 체크리스트 (Medium = 의무 2 + 권장 2)

| ATK | 답변 |
|---|---|
| 인접 불변조건 (의무) | Footnote 2·3 발효일 placeholder + 30일 freeze + 발동 카운트 분기 패턴 = Footnote 4 도 동일 패턴 (placeholder ISO8601 + 30일 advisory + auto-expire/escalate 분기). |
| 이전 실패 (의무) | `spec-doc-management` retrospective §3·§7 — 사전 grep 누락 (영향 파일 15→26, +73%) + 단순 치환을 subagent Edit 반복으로 처리 (Phase B 54 tool calls). 본 feature 가 두 원인을 정확히 룰화. |
| 비명시 제약 (권장) | G2 `mode: main-batch` 는 §5.4 위임 임계 OR 4중과 직교 — 위임 임계는 "위임 vs 메인", G2 는 "메인 내부 방식 (sed 일괄 vs Edit 직접)". 두 게이트 동시 명시 필요. |
| MVP 경계 (권장) | 룰 본문·SKILL·템플릿 변경만. 코드/스크립트 없음. 차단 게이트 승격 금지. 발효일 placeholder 유지 — 머지 직후 별도 1줄 follow-up commit 으로 채움 (Footnote 1·2·3 동일 절차). |

## 6. 마이그레이션·롤백

- 마이그레이션: 없음 (룰 본문 추가만).
- 롤백: 단일 PR `git revert` — 4중 동기 파일 변경이 한 PR 묶음에 들어가므로 일관 복원.

## 7. 엣지케이스

- G1 grep 결과가 광역 (50+ 파일) 인 경우 — 영향 파일 표에 전체 나열 대신 패턴별 그룹화 + 대표 파일 `file:line` 인용 허용.
- G2 `mode: main-batch` Phase 가 §5.4 위임 임계 (영향 파일 ≥4) 충족 시 — 메인이 sed 배치 처리하되 결과 검증을 Plan/Explore 서브에이전트에 위임 가능. 이중 사용 허용.
- Footnote 4 발효 전 (placeholder 상태) 본 feature 자체는 grandfathered — dogfooding 권장이나 발동 카운트 누적 미시작.

## 8. 작업 규모 추정

- 외부 IO 결과량 < 50K char (4중 동기 파일 크기 합 추정).
- Cross-cutting 키워드: `cross-cutting`/`i18n`/`security`/`migration`/`cargo` 모두 미매치.
- 그러나 **영향 파일 5개 ≥ 4** → §5.4 위임 임계 충족 → s2 에서 ≥2 Phase 권장.
- Phase 분할 권장안: Phase A = `design-rule.md` 본문 추가 (§3·§5.4·§6 단일 파일, mode: main-direct), Phase B = 4중 동기 + harness-entry SKILL Readiness Validation (mode: main-batch + 메인 Edit).

## 9. 확인 필요 항목 (모두 합의 완료)

1. ✅ G1·G2 만 채택, G3·G4 제외 (Context Carry #3).
2. ✅ 위임 방식 2분기 (`subagent` / `main-batch`) (Context Carry #2).
3. ✅ §6 Footnote 4 신설 (Context Carry #1).
4. ✅ 발효일 채움 = 머지 직후 1줄 follow-up commit (Footnote 1·2·3 동일 절차).
