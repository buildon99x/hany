---
kind: feat
name: spec-doc-management
stage: 1
status: active
---

# Spec Doc Management — Stage 1 Feature Specification

> 이전 Stage 문서: 해당 없음 (Stage 0 없이 직접 Stage 1 시작)

## 컨셉

`docs/` 루트에 흩어진 feat spec 문서를 `docs/spec/` 디렉토리로 통합하고, 각 문서에 frontmatter 표준을 추가하여 발견성·생명주기 추적·이식 시 명확성을 확보한다.

**해결하는 문제**
- `feat_*_s*.md` 파일이 어디 있는지, 어느 것이 활성인지 알 수 없음.
- 다른 프로젝트에 하네스 이식 시 무엇을 가져가야 할지 불명확.

**비-목표**: 파일 물리적 이동 없이 hook 만 수정 (hook 경로 패턴 변경이 핵심). portability frontmatter 확장·APPLY.md Core Portable Files 목록 추가는 이번 범위 제외.

## 데이터/상태 모델

### feat 문서 frontmatter 표준

모든 stage 문서(`docs/spec/*_s{N}.md`)에 아래 frontmatter 추가:

```yaml
---
kind: feat          # feat | fix
name: {feat-name}
stage: 0            # 0 | 1 | 2
status: active      # active | complete | archived
---
```

### 새 경로 컨벤션

| 종류 | 이전 경로 | 이후 경로 |
|---|---|---|
| Stage 문서 | `docs/feat_{name}_s{N}.md` | `docs/spec/{name}_s{N}.md` |
| Ledger | `docs/feat_{name}_harness_ledger.md` | `docs/spec/{name}_harness_ledger.md` |
| Index (신규) | 없음 | `docs/spec/INDEX.md` |

### SPEC_INDEX (docs/spec/INDEX.md)

| name | kind | stage | status | 요약 |
|---|---|---|---|---|
| harness-improvements | feat | 0 | active | Core/Layer 분리 이데이션 |
| spec-doc-management | feat | 1 | active | spec 문서 관리 구조 확립 |

## 활성 로직

1. **`/stage-end` 저장 시**: `docs/spec/{name}_s{N}.md` 저장 + `docs/spec/INDEX.md` 해당 행 갱신 — workflow 체크리스트 항목으로 추가.
2. **feat 완료·포기 시**: INDEX.md `status` → `complete` / `archived` 수동 변경.
3. **Hook 경로 패턴**: `docs/feat_*` → `docs/spec/*` 로 갱신. `_s1.md`/`_s2.md` suffix 매칭 유지.
4. **기존 파일 마이그레이션**: `docs/feat_harness-improvements_s0.md` → `git mv` → `docs/spec/harness-improvements_s0.md` + frontmatter 추가.

## 영향 파일 표

| 파일 | 변경 방향 | 전제조건 |
|---|---|---|
| `.claude/hooks/post_edit_quality_gate.mjs` | `docs/feat_*_s{1,2}` 패턴 → `docs/spec/*_s{1,2}` | 양/음성 테스트 케이스 동시 추가 |
| `.claude/hooks/user_prompt_harness_context.mjs` | 트리거 키워드 `docs/feat_` → `docs/spec/` 추가·대체 | hooks:test 0 실패 |
| `.claude/hooks/stop_exit_check.mjs` | `docs/feat_*_harness_ledger.md` → `docs/spec/*_harness_ledger.md` | 양/음성 테스트 케이스 동시 추가 |
| `scripts/test-hooks.mjs` | 새 경로 케이스 추가 | Phase A 완료 조건 |
| `.claude-context/design-rule.md` §5.1 | 경로·frontmatter 컨벤션 갱신 | Phase A 통과 후 |
| `.claude/commands/stage-end.md`, `stage-start.md` | 예시 경로 갱신 | design-rule §5.1 갱신과 동일 commit |
| `.claude/skills/design-stage/SKILL.md` | 예시 경로 갱신 | 동상 |
| `docs/harness/HARNESS_OPERATING_PLAYBOOK.md` | 경로 언급 갱신 | 4중 동기 |
| `docs/harness/HARNESS_LEDGER_TEMPLATE.md` | ledger 경로 갱신 | 4중 동기 |
| `docs/harness/CLAUDE_CODE_HARNESS_APPLY.md` | 경로 언급 갱신 | 4중 동기 |
| `docs/harness/README.md` | 경로 언급 + SPEC_INDEX 진입 링크 | 4중 동기 |
| `CLAUDE.md` | Design Workflow 경로 갱신 | 동기 |
| `docs/spec/INDEX.md` | 신규 생성 | Phase B |
| `docs/spec/harness-improvements_s0.md` | `git mv` + frontmatter 추가 | Phase B |
| `docs/spec/spec-doc-management_s1.md` | 저장 (본 문서) | Phase B |

**영향 파일 15개** → §5.4 위임 임계 C4 충족 → Phase 별 서브에이전트 위임 권장.
**단일 Slice 가능**: cross-cutting 키워드 없음. 단 영향 폭으로 Phase A·B 분할 진행.

## ATK 체크리스트

1. **인접 불변조건** — hook 3개 동시 변경 시 중간 commit 에서 path 불일치 발생 가능. Phase A에서 hook + test 먼저 green 확인 후 Phase B (경로 실제 이동) 진입 의무.
2. **이전 실패** — `scripts/lib/` 누락처럼 "있다고 가정한 경로 부재" 패턴 반복. Phase A 완료 = `npm run hooks:test` 0 실패가 Phase B 진입 게이트.
3. (권장) **비명시 제약** — `user_prompt_harness_context.mjs` 트리거 키워드 대체 시 `docs/feat_` 완전 제거 주의. archive 내 파일 참조 prompt 미트리거 가능성 → `docs/spec/` 추가 후 기존 키워드 병행 유지 여부 결정.
4. (권장) **MVP 경계** — portability 확장·APPLY.md Core Portable Files 제외. Phase B에서 INDEX.md + 마이그레이션 + 4중 동기만.

## 엣지케이스

- `docs/.archive/` 내 legacy 파일: `docs/feat_*` 패턴 잔존 → hook 변경 후 archive 내 파일은 매칭 안 됨. 의도된 skip 으로 명시.
- `fix-name` 문서 생성 시 frontmatter `kind: fix` 자동 채움 — `design-rule §5.1` 에 명시.
- INDEX.md 행 누락 방지 — `/stage-end` 체크리스트에 "INDEX.md 행 갱신" 포함.

## Phase 설계 (Stage 2 입력)

| Phase | 작업 | 완료 조건 |
|---|---|---|
| A | hook 3개 패턴 변경 + `test-hooks.mjs` 케이스 추가 | `npm run hooks:test` 전체 passed, 0 failed |
| B | design-rule §5.1 갱신 + commands/skills/CLAUDE.md 경로 갱신 + 4중 동기 + git mv + INDEX.md 생성 | 4중 동기 확인 + `docs/feat_*` 파일 0개 |

## § Context Carry

| 항목 | 결정 | 기각 옵션 | 기각 사유 |
|---|---|---|---|
| 파일명 prefix | A2 — prefix 없음, `kind:` frontmatter 로만 구분 | A1 (`feat_`/`fix_` prefix 유지), A3 (디렉토리 분리) | A1 — hook 정규식 복잡도 증가 불필요; A3 — 경로 깊이 증가 대비 이득 미미 |
| Ledger 위치 | B1 — `docs/spec/` 통합 | B2 (`docs/ledger/` 분리) | stage doc 과 ledger cross-link 많아 분리 시 탐색 비용 증가 |
| portability frontmatter 확장 | 제외 | 전체 harness 문서 확장 | scope 집중; harness-improvements Stage 1에서 별도 다룸 |
| APPLY.md Core Portable Files | 제외 | scripts/lib/ 목록 명시 | scope 집중 |
