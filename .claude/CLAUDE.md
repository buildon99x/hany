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

## Harness (opt-in)
슬래시 커맨드로만 활성화됨. 명시 호출 없이는 강제 진입하지 않는다.

| 커맨드 | 용도 |
|---|---|
| `/harness-start {feat-name}` | Medium+ 피처 실행 |
| `/harness-maintain` | Harness 자기 수정 |
| `/harness-loop` | GitHub 이슈 자율 워크 사이클 (명시 호출 한정) |

훅·Non-negotiables·체크리스트 상세: `docs/harness/README.md`.

## Design Workflow
단계적 기능 설계는 `design-stage` 스킬(`.claude/skills/design-stage/SKILL.md`)로 위임.
슬래시: `/stage-start {N} [feat-name]` · `/stage-end {N}`. 산출물: `docs/spec/{feat-name}_s{N}.md`.

## Token optimization (AI 지침)
탐색은 `docs/architecture.md` 우선(Glob/Grep 반복 최소화) · 대규모 파일은 offset/limit으로 부분 읽기 · `dispatch_skill!` 매크로 사용(20-arm match 직접 작성 금지) · 진행 상황 출력 최소화, 결과만 보고.
