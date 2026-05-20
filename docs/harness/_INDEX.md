# Harness 문서 역할 인덱스

각 `.md` 파일이 Claude 실행 중 직접 참조되는 **동작 문서**인지, 사람이 배경/이력을 읽는 **참고 문서**인지 분류한다. 파일 frontmatter `role: behavior | reference` 값과 일치해야 한다.

## role: behavior (Claude가 실행 중 직접 읽음)

훅·스킬·슬래시 명령어가 로드하거나, 워크플로우 단계에서 작성/소비하는 문서. 변경 시 반드시 `HARNESS_SELF_MAINTENANCE.md` 절차 적용.

| 파일 | 사용 시점 |
|---|---|
| `HARNESS_OPERATING_PLAYBOOK.md` | feature/harness 작업 진입 시 7단계 절차 |
| `HARNESS_SELF_MAINTENANCE.md` | `/harness-maintain` 명령 + 자기 수정 경로 편집 시 |
| `FEATURE_DIFFICULTY_TIERS.md` | Low/Medium/High 분류 결정 |
| `PHASE_TEMPLATE.md` | **현행** — 피처 진행 중 Gate Matrix + Work Status 통합 |
| `HANDOFF_TEMPLATE.md` | **현행** — PR/완료 시 Quality Note + Retro 트리거 통합 |
| `FEATURE_REVIEW_CHECKLIST.md` | 사용자 노출 변경 리뷰 |
| `DATA_INVENTORY_TEMPLATE.md` | 데이터 수집/저장/표시 시 인벤토리 작성 |
| `HARNESS_LEDGER_TEMPLATE.md` | `/harness-start` Ledger 초기화 |
| `GLOSSARY.md` | 분류·축 매핑 결정 기준 |
| `ADDITIONAL_REVIEW_PERSPECTIVES.md` | 리뷰 시 보충 시각 적용 |
| `UX_PRIVACY_DESIGN_GUIDE.md` | UX/프라이버시 설계 시 원칙 |
| `HARNESS_LOOP_ISSUE_FILTERING.md` | harness-loop 이슈 필터링 규칙 |

### Deprecated (호환용 유지, 신규 작업에서 사용 금지)
| 파일 | 대체 |
|---|---|
| `QUALITY_GATE_MATRIX.md` | → `PHASE_TEMPLATE.md` §1–§7 |
| `WORK_STATUS_TEMPLATE.md` | → `PHASE_TEMPLATE.md` §8 |
| `FEATURE_QUALITY_NOTE_TEMPLATE.md` | → `HANDOFF_TEMPLATE.md` §1–§9 |
| `HARNESS_RETROSPECTIVE_TEMPLATE.md` | → `HANDOFF_TEMPLATE.md` §10 (회고 본문 섹션 정의는 본 파일 참조) |

## role: reference (사람이 배경·이력 확인용)

설정·정책 의도, 적용 가이드, 의사결정 기록. Claude는 일반적으로 읽지 않으며, 사람이 시스템을 이해/온보딩할 때 참고.

| 파일 | 용도 |
|---|---|
| `README.md` | 문서 지도 (탐색용) |
| `HARNESS_PLAN.md` | 북극성 정책 의도 |
| `HARNESS_ARCHITECTURE.md` | 아키텍처 개요 |
| `IMPLEMENTATION_SEQUENCE.md` | 출시 단계 참고 |
| `CLAUDE_CODE_HARNESS_APPLY.md` | 하네스 적용 셋업 가이드 |
| `HARNESS_LOOP_DASHBOARD.md` | harness-loop 운영 대시보드 |
| `PLAN_REVIEW_GEMINI.md` | Gemini 플랜 리뷰 결과 |
| `adr/*.md` | 의사결정 기록 |
| `simulations/*.md` | 드라이런 결과 |
| `log/*.md` | 세션 동작 로그 |

## role: artifact (완료된 피처 산출물 — 불변 이력)

특정 피처의 완료 산출물. 템플릿이 아니며 신규 작업에서 참조하지 않음.

| 패턴 | 예시 |
|---|---|
| `FEATURE_QUALITY_NOTE_{feat}.md` | `FEATURE_QUALITY_NOTE_auto-skill-sp-economy.md` 외 2건 |
| `DATA_INVENTORY_{feat}.md` | `DATA_INVENTORY_session-efficiency-metrics.md` |
| `DATA_INVENTORY.md` | 통합 인벤토리 (운영 중 누적) |
| `session_metrics_{date}.md` | `session_metrics_2026-05-04.md` |

## 분류 변경 절차

1. `_INDEX.md` 표 갱신 → 같은 커밋에 frontmatter `role:` 동기화.
2. behavior → reference 강등 시: 훅/스킬에서 해당 파일 참조 모두 제거 확인.
3. reference → behavior 승격 시: `HARNESS_SELF_MAINTENANCE.md` 적용 경로에 자동 포함 (이미 `docs/harness/` 전체 매칭).
