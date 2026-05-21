---
kind: feat
name: harness-monitor-dashboard
stage: 1
status: active
---

# Harness Monitor Dashboard — Stage 1 기능 설계

> 이전 Stage 문서: 해당 없음 (신규).
> **[하네스 테스트 목적]** 본 spec 은 Medium tier 하네스 전체 흐름 (Readiness Validation → Phase A·B → advisory 게이트 발동 확인 → retrospective) 을 검증하는 테스트 케이스로 설계됨.

## 1. 컨셉

`docs/spec/*_harness_ledger.md` 파일들을 파싱해 **정적 HTML 대시보드** 를 생성하는 Node.js 스크립트. `npm run harness:dashboard` 한 줄로 실행 → `docs/harness/dashboard.html` 출력. 브라우저에서 직접 열기 가능.

표시 항목: feature 목록 · Phase 상태(이모지) · Loop Budget 소진율 · advisory 태그 발동 카운트 · Effort 요약.

서버 없음 · 런타임 의존성 없음 · 순수 Node.js 내장 + 인라인 CSS.

## 2. 화면 구성 (정적 HTML)

| 섹션 | 내용 |
|---|---|
| Feature 목록 | feature name · tier · branch · Phase 상태 표 (🔲/🟡/✅/⚠️) |
| Loop Budget | Phase 별 자동 수정 시도 카운트 / 정지 발동 여부 |
| Advisory Triggers | `[pre-grep-trigger]` · `[delegation-mode-trigger]` · `[verify-tag-trigger]` · `[subagent-verify-trigger]` 태그 발동 카운트 |
| Effort Summary | Phase 별 In/Out 토큰 · Mark (`[T]`/`[K]`/`[TK]`) — Effort Ledger sentinel 영역 파싱 |

## 3. 데이터 흐름

```
docs/spec/*_harness_ledger.md (readdirSync glob)
  → Phase Status 섹션 파싱 (markdown 표 → 구조체)
  → Loop Budget Tracker 섹션 파싱
  → Decision Log advisory 태그 grep ([pre-grep-trigger] 등)
  → Effort Ledger sentinel 영역 파싱 (harness-effort-collect.mjs 동일 패턴)
  → HTML 템플릿 문자열 렌더링 (인라인 CSS)
  → docs/harness/dashboard.html 저장
```

## 4. 영향 파일 표

> 사전 grep 결과 (`grep -rl 'harness:dashboard\|generate-harness-dashboard' .`): 0건 → 신규 파일만 추가.

| # | 파일 | 변경 요지 | 전제조건 | file:line |
|---|---|---|---|---|
| 1 | `scripts/generate-harness-dashboard.mjs` | 신규 — ledger md 파싱 + HTML 생성 메인 스크립트 | `docs/spec/` 디렉터리 존재 · Node.js 내장만 사용 | `new` |
| 2 | `package.json` | `"harness:dashboard": "node scripts/generate-harness-dashboard.mjs"` 커맨드 추가 | 기존 `"harness:effort"` 패턴 (line 12) | `package.json:12` |
| 3 | `docs/harness/dashboard.html` | 스크립트 출력 산출물 — `.gitignore` 에 추가 | 스크립트 실행 후 생성 | `new` |
| 4 | `.gitignore` | `docs/harness/dashboard.html` 1줄 추가 | 기존 ignore 패턴 | `multi` |

## 5. Context Carry

| # | 결정 | 기각 옵션 | 기각 사유 |
|---|---|---|---|
| 1 | **정적 HTML 생성** (서버리스) | 로컬 dev server / Tauri webview 통합 | MVP — 배포·포트 관리 불필요. `open dashboard.html` 으로 충분 |
| 2 | **Node.js 내장만 사용** (외부 라이브러리 0) | marked.js 등 파서 라이브러리 | 런타임 의존성 0 유지. harness-effort-collect.mjs 동일 패턴 |
| 3 | **dashboard.html gitignore** | 커밋 포함 | 생성 산출물 — `npm run harness:dashboard` 로 언제든 재생성 |
| 4 | **advisory 태그 카운트 표시** | Phase 상태만 표시 | 하네스 테스트 목적 — Footnote 4 게이트 발동 수치 시각화 검증 |
| 5 | **Phase B = advisory 게이트 의도적 누락 시나리오** | Phase B 도 정상 기능 구현 | 하네스 에스컬레이션 흐름 테스트 목적 달성에 핵심 |

## 6. ATK 체크리스트 (Medium = 의무 2 + 권장 2)

| ATK | 답변 |
|---|---|
| 인접 불변조건 (의무) | `scripts/lib/` 모듈 (scrubber, kpi 등) 이 이미 존재 — generate-harness-dashboard.mjs 는 독립적으로 동작하나 동일 디렉터리. 기존 `"harness:effort"` npm 커맨드 패턴 유지. `package.json` 스크립트 블록 형식 일관. |
| 이전 실패 (의무) | `scripts/lib/transcript-adapter.mjs` · `scrubber.mjs` 누락으로 세션 시작 시 tests 2건 실패한 전례. 신규 스크립트는 `scripts/lib/` import 없이 Node.js 내장만 사용 → bootstrap 의존성 회피. |
| 비명시 제약 (권장) | ledger 파일 경로가 `docs/spec/` (신 경로, spec-doc-management 마이그레이션 완료). glob 패턴은 `docs/spec/*_harness_ledger.md` 고정. `docs/feat_*` 구 경로 조회 불필요. |
| MVP 경계 (권장) | 파싱 대상 = 현재 존재하는 ledger md 파일만. 실시간 감시(fs.watch) · 자동 새로고침 · CI 통합 없음. HTML 스타일은 인라인 CSS 최소한. 외부 CDN 폰트/아이콘 없음. |

## 7. 마이그레이션·롤백

- 마이그레이션 없음 (신규 파일만 추가).
- 롤백: `git revert` 단일 커밋 → 스크립트·package.json·.gitignore 원복. `dashboard.html` 은 gitignore 대상이므로 수동 삭제.

## 8. 엣지케이스

- ledger 파일 0건 → "No features tracked yet" 빈 상태 HTML 정상 출력.
- Effort sentinel 미채움 ledger → 해당 행 `n/a` 표시 (파싱 실패 시 silent skip).
- advisory 태그가 없는 ledger → 카운트 0 표시.
- `docs/harness/` 디렉터리 없으면 `mkdirSync({ recursive: true })` 로 생성.
- ledger md 의 Phase Status 표 형식이 예상과 다른 경우 → 해당 feature `parse error` 배지 표시.

## 9. 작업 규모 추정

- 외부 IO 없음 · cross-cutting 키워드 없음.
- 영향 파일 4개 = §5.4 위임 임계 충족 → s2 에서 ≥2 Phase 권장.
- Phase 분할안: Phase A = 스크립트·package.json·.gitignore (정상 기능) · Phase B = advisory 게이트 의도적 누락 + 발동 확인 + 복구 (하네스 테스트 시나리오).
- 단일 Slice 면제 불가 (영향 파일 4개).
