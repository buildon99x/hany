# Harness Improvements — Stage 0 Ideation

> 이전 Stage 문서: 해당 없음 (신규)

## 배경
- `/harness-maintain` 모드에서 출발. 진입 시 `harness-effort-collect` 테스트 2건 실패 (`scripts/lib/transcript-adapter.mjs` · `scripts/lib/scrubber.mjs` 누락) 발견.
- 현재 init commit 후 lib 모듈이 누락된 상태로 브랜치가 시작됨 → bootstrap 무결성 문제로 식별.
- 사용자 의도: "부분 자동화만 적용" + "범용 하네스로 구성".

## 탐색된 개선 영역
A. Bootstrap·무결성 — lib 모듈 누락 자동 감지.
B. §6 Advisory Footnote 자동화 — placeholder 채움·발동 카운트·만료 알림.
C. Effort Ledger 통합 흐름 점검.
D. 문서 4중 동기 (Playbook ↔ design-rule ↔ Apply Guide ↔ README) drift 탐지.
E. Loop Budget 영속 가시화.
F. Skill ↔ Command ↔ Design-rule 일관성 검증.
G. Privacy Scrubber 적용 범위 확장.
H. Cross-platform 검증 자동화 (현재 CI 매트릭스 부재).

## 좁혀진 방향 (사용자 결정)
- **자동화 범위**: 부분 자동화 — 차단 없는 탐지·보고 헬퍼만. "자동화 헬퍼 0" 원칙 (§6 Footnote 1) 의 auto-expire 실행과 충돌 없음.
- **구조**: Model 2 — Harness Core / Project Layer 분리.

## 분리 모델 후보 (Stage 1 입구로 이월)
- **2a 물리적 분리** (디렉토리 이동) — Claude Code 자동 발견 호환 위험.
- **2b 논리적 분리** (frontmatter `layer: core | project`) — 마이그레이션 비용 최저, 자동 발견 호환. 추천 안.
- **2c Submodule/Subtree** — 진짜 범용성, 운영 비용 큼.

## Layer 경계 후보 (Stage 1 입구로 이월)
- **Core 후보**: hook 스크립트, skill 정의, slash command 라우터, design-rule, harness docs (Playbook/Glossary/Tiers/Templates), self-maintenance guide, `scripts/lib/*` 파서.
- **Project Layer 후보**: 빌드/테스트 커맨드 (`npm run *`), Tauri 특화 체크리스트 항목, Non-negotiables 7종 (Pixel Horizon 도메인), Data Inventory 도메인 항목.
- **경계 모호**: `harness-effort-collect.mjs`, `_config.mjs`.

## 제약·위험
- Hook 경로 변경 시 `settings.json` 동시 갱신 의무 (fail-safe 우회 불가).
- Self-application 회귀: 분리 룰을 본 PR 적용 시 임시 모호 상태.
- §6 Footnote freeze 권장과 충돌 회피 — 구조 변경만이면 본문 무관.
- "자동화 헬퍼 0" 원칙 (§6 Footnote 1) — auto-expire 실행 헬퍼 금지, 탐지·보고는 허용.

## Stage 1 진입 전 결정해야 할 항목 (미결)
1. 분리 모델 2a / 2b / 2c 선택.
2. Layer 경계: "도메인 의존만" vs "빌드 커맨드까지".

## 참고
- 본 세션 `npm run hooks:test` 결과: 64 passed, 0 failed (브랜치 `claude/harness-maintain-voXcw` 기준).
- 관련 PR: buildon99x/hany#1 (머지 완료).
