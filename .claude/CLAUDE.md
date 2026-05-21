# CLAUDE.md — Pixel Horizon

Harness Project - Hany

> Module/command inventory: `docs/architecture.md` (auto-generated via pre-commit hook). Do not edit by hand.

## File encoding
- **모든 파일은 UTF-8 (BOM 없음)으로 저장한다.** 편집기·도구 설정과 무관하게, 새 파일 생성 및 기존 파일 수정 시 인코딩을 UTF-8로 유지한다.

## Commands
- `npm run tauri build [-- --no-bundle]` — production build
- `npm run typecheck` / `npx tsc --noEmit`
- `npm test` / `npm run test:watch` — Vitest
- `npm run lint` / `npm run lint:all` runs both.

- `npm run hooks:test` — runs harness-hook cases. Must stay green before any hook/settings change.
- `npm run release:bump` / `npm run release:local` — local release flow (see `release-local` / `release-tag` skills).




### TypeScript
- `strict: true`, `noUnusedLocals`, `noUnusedParameters`. Remove unused imports.
- `types.ts` → pure type defs, zero runtime deps. `state.ts` → getters/setters only.
- `main.ts` → `init()` + event listeners; business logic belongs in modules.
- Tauri event payloads: `listen("…", (event: unknown) => { const e = event as { payload: T }; … })`.
- Import order (no cycles): Types → Utils → Features → State → Main.
- Dev-only: `if (import.meta.env.DEV) { await import('./dev/…'); }`.
- UI changes: `index.html` (DOM) + `src/styles/*.css` + `src/**/*.ts`. On removal, purge listeners, state refs, CSS.

## CI / Docs
- CI: `tsc --noEmit` (advisory) (blocking, 8-stage strict).
- `docs/architecture.md` auto-regenerates via pre-commit hook (`scripts/generate-architecture.sh`). Design docs live in `docs/`.  `docs/.archive`는 무시(legacy).

## Harness
모든 feature 변경은 `docs/harness/HARNESS_OPERATING_PLAYBOOK.md` 진입. Medium+ tier는 `/harness-start {feat-name}` 필수 — Decision Ledger(`docs/spec/{name}_harness_ledger.md`) 초기화 + Phase 오케스트레이션 + 완료 후 Retrospective. 용어는 `docs/harness/GLOSSARY.md`.

**Hooks 동작 요약**: `PreToolUse(Bash)` destructive/force-push deny, `PreToolUse(Edit|Write)` 프라이버시 가드, `Stop` 필수 harness 문서 검증. 전체 인벤토리·skills 목록·세부 동작은 `docs/harness/README.md`. 검증 `npm run hooks:test`. Strict mode `PIXEL_HORIZON_STRICT_STOP=1`.

**Non-negotiables** (SessionStart hook이 매 세션 주입, 여기에도 명시): aggregate-only 입력 · 프라이버시 스크러버 · 라이프사이클 정리 · 영속 스키마/마이그레이션 증거+롤백 · loop budget (동일 실패 auto-fix 3회 / 무변경 rerun 2회 도달 시 stop & ask).

## Design Workflow
복잡 기능은 Stage 0 (아이데이션) → 1 (기능 설계) → 2 (구현 계획). 규칙 원본 `.claude-context/design-rule.md`. 트리거 `/stage-start {N} [feat-name]` · `/stage-end {N}`. 산출물 `docs/spec/{feat-name}_s{N}.md`.

## Planning Rules (사용자 지침)
- **계획(Plan)에 코드를 절대 포함하지 않는다.** 파일 경로, 수정 방향, 로직 설명만 서술. 코드는 구현 단계에서만.
- 계획은 간결하게: 파일별 변경 사항을 1~2줄로 요약. 불필요한 반복 금지.
- 좋은 예: `src/state.ts — getLevel() 반환값에 rebirth 보정 로직 추가`
- 나쁜 예: 위 항목에 실제 함수 구현 코드까지 포함
- 위 규칙은 Stage 1·2 동안 그대로 활성 — Design Workflow의 하위 규칙으로 작동.

## Token optimization (AI 지침)
탐색은 `docs/architecture.md` 우선(Glob/Grep 반복 최소화) · 대규모 파일은 offset/limit으로 부분 읽기 · `dispatch_skill!` 매크로 사용(20-arm match 직접 작성 금지) · 진행 상황 출력 최소화, 결과만 보고.
