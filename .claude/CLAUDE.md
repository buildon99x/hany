# CLAUDE.md — Pixel Horizon

Rust (Tauri 2.0) + TypeScript (Vite) desktop app. Keyboard/mouse input → pixel art on a chunked canvas. XP → level → rebirth → skills.

> Module/command inventory: `docs/architecture.md` (auto-generated via pre-commit hook). Do not edit by hand.

## File encoding
- **모든 파일은 UTF-8 (BOM 없음)으로 저장한다.** 편집기·도구 설정과 무관하게, 새 파일 생성 및 기존 파일 수정 시 인코딩을 UTF-8로 유지한다.

## Commands
- `npm run tauri:dev` — run app (dev). Loads `src-tauri/tauri.dev.conf.json` so dev uses identifier `com.pixel.horizon.dev`, giving dev/release distinct app data dirs and non-conflicting single-instance locks.
- `npm run tauri build [-- --no-bundle]` — production build
- `npm run typecheck` / `npx tsc --noEmit`
- `npm test` / `npm run test:watch` — Vitest
- `npm run lint` / `npm run lint:css` (add `:fix` to auto-fix). `npm run lint:all` runs both.
- `npm run i18n:validate` — 8-stage strict validator (blocking in CI). `:warn` for non-blocking local runs.
- `npm run hooks:test` — runs harness-hook cases. Must stay green before any hook/settings change.
- `npm run release:bump` / `npm run release:local` — local release flow (see `release-local` / `release-tag` skills).
- `cd src-tauri && cargo clippy && cargo fmt`

## Where things live

### Rust (`src-tauri/src/`)

> Sizes & full inventory: `docs/architecture.md` (auto-generated).

| File | Role |
|---|---|
| `models.rs` | Data structs, constants, `dispatch_skill!` macro, `SkillState` helpers |
| `input.rs` | `handle_input_event` → XP + pixel + skill triggers |
| `lib.rs` | Tauri builder, input listener thread, dev atomics, command registration |
| `state.rs` | JSON save/load (`state.json`, `horizon_stats.json`), debounced writes |
| `xp.rs` | XP gain computation (catalyst, night owl, input synergy) |
| `encoding.rs` | PHB binary format for block entries |
| `accessibility.rs` | macOS Accessibility / Input Monitoring checks |
| `paths.rs` | `app_data_dir` helpers |
| `vendor/rdev/` | Patched fork (macOS CGEventTap crash fix). **Do not update via cargo.** |

**IPC commands** (`commands/`): `stats` · `gallery` · `canvas` · `skills` · `emoji_export` · `image_source` · `dev`(debug-only) · `dev_meta`(debug-only). 정확한 명령 수·시그니처는 `docs/architecture.md`.

### TypeScript (`src/`)

| Dir/File | Key files | Role |
|---|---|---|
| `main.ts` | — | `init()` + Tauri event listeners |
| `state.ts` | — | Cached state, getters/setters, WPM, `drawPixel` |
| `types.ts` | — | Pure type defs, zero runtime deps |
| `canvas/` | `CanvasManager`, `EmojiMask`, `CutsceneSequencer`, `ImageColorSource` | Chunked canvas, emoji rendering, layer transitions |
| `pages/` | `GalleryPage`, `PalettePage`, `DashboardPage`, `SkillsPage`, `EmojiExportModal`, `ImageCropModal`, `PageRouter` | Page components |
| `ui/` | `PixoFSM`, `ChromvoxAvatar`, `ProfilingPanel`, `CanvasSkillPanel`, `NumberAnimator`, `svg`, `palette` | Avatar FSM, HUD, animations |
| `effects/` | `pixelFx`, `confetti` | Visual FX overlays |
| `utils/` | `chromvoxCoaching`, `briefing`, `color`, `gallery-milestones`, `localDay`, `format`, `notification`, `confirm` | Shared logic |
| `skills/` | `upgrade-defs.ts` | 20 skill metadata (UPGRADE_DEFS, UPGRADE_CATEGORIES) |
| `emoji/` | `pools.ts` | Emoji pool management |
| `dev/` | `ScenarioRunner`, `GodModePanel`, `SkillTreeAdmin`, `ScenarioReport` | Debug-only (dynamic import) |

### CSS (`src/styles/`)
One file per component, loaded from `index.html`. Largest: `dashboard`, `palette`, `gallery`.

## Architecture essentials

### Input pipeline
`rdev::listen` (Rust thread) → `input::handle_input_event` → mutates `AppState` → `emit("input-event" | "level-up" | "skill-level-up" | "palette-updated")` → `main.ts` listeners → `state.ts` → `CanvasManager.drawPixel()`. UI refresh throttled 200ms.

### State
- **Rust**: `AppState` behind `AppHandleHolder(Arc<Mutex<AppState>>)`. Use `lock_state(&holder)` to acquire.
- **TS**: `state.ts` holds cached copies. Access **only** via getters/setters — no direct var export (avoid circular-import `undefined`).
- **Persistence** (app data dir): `state.json`, `horizon_stats.json`, `emoji_categories.json`, `chunks/` (PNG+PHB), `layers/` (thumb+meta).

### Skill dispatch pattern
`models.rs` defines `dispatch_skill!` macro that maps skill id strings to `SkillState` struct fields. All dynamic skill access goes through helper methods:
- `SkillState::level_of(id)` → `Option<u32>`
- `SkillState::skill_ref(id)` / `skill_mut(id)` → `Option<&SkillInfo>` / `Option<&mut SkillInfo>`
- `SkillState::total_levels()` — sum of all skill levels
- `SkillState::max_out_all()` — set all skills to max
- `AppState::record_skill_trigger(id, now_ms, triggers, xp, pixels)` — consolidated trigger recording

When adding a new skill: update `SkillState` struct + `SKILL_MAX_LEVELS` array + `dispatch_skill!` macro arms (all in `models.rs`). No other files need match-arm changes.

### Canvas
Virtual height grows in 1600px chunks. Blocks logged as **rendered** color (`drawColor`), not palette original — replay is idempotent. Ghost clear = `destination-out` compositing.

### Skills
20 skills in 6 branches. Level 5000 → rebirth → +5 SP.
- `kb_efficiency` / `mouse_efficiency` (0–5): auto-level from `lifetime_*` via `EFFICIENCY_THRESHOLDS`
- `pixel_precision` (0–3): block size `[16, 8, 4, 2]` via `PIXEL_PRECISION_SIZES`
- `palette_depth` (0–10): capacity 500 → level×10k → 16.7M

### Constants
`REBIRTH_THRESHOLD=5000`, `REBIRTH_SP_REWARD=5`, `XP_PER_LEVEL=100`, `MAX_EVENT_LOG_ENTRIES=200`, `BUCKETS_PER_DAY=144` (10-min granularity), `SAVE_DEBOUNCE_MS=5000`.

## Critical rules

### Rust
- IPC commands: `#[tauri::command] pub (async) fn … -> Result<T, String>`. Register in `lib.rs` under `tauri::generate_handler![commands::module::fn, …]` — **full paths required**.
- State param: `state: tauri::State<'_, AppHandleHolder>` → `lock_state(&state)`.
- Dev-only: `#[cfg(debug_assertions)]` on both impl and `generate_handler!` entry.
- Macros: define in `lib.rs`, `pub(crate) use dbg_log;`, then `use crate::dbg_log;` in child modules.
- `tokio` features: only `["rt", "time"]`. Never `"full"`.
- Bundle targets: per-platform (`["nsis"]` / `["deb"]`), never `"all"`.
- Always `cargo clippy` + `cargo fmt` before commit.
- **Zero warnings** in `pixel-horizon` lib on `cargo check`. `vendor/rdev` warnings (3) are the only allowed exception (patched fork, do not touch).
- **Cross-platform `#[cfg]` gates**: when a const/type/fn is only used inside a `#[cfg(target_os = "X")]` block, gate the definition with the same cfg — OR if the type is exposed in a public signature on all platforms, add `#[allow(dead_code)]` with a one-line comment explaining the cross-platform asymmetry.
- **Vendor crate cfg noise** (e.g. `objc` 0.2.x archived macros emit `#[cfg(feature = "cargo-clippy")]`): silence via `[lints.rust] unexpected_cfgs.check-cfg` in `Cargo.toml` (declares the cfg as known, lint stays active for other unknowns). Outer `#[allow(unexpected_cfgs)]` on a module does NOT propagate into macro expansions reliably.
- Release profile: thin LTO, codegen-units=1, strip.
- `Cargo.toml`: edit only when a new dep or feature flag is genuinely required. No reorder, reformat, version bumps, or cosmetic diffs. Lint level changes (`[lints]` section) for warning suppression count as required when no source-level fix exists.
- **Test code location** (Claude token cost optimization, see `docs/feat_rust-testcode-refactoring_s0.md`): production `*.rs` files whose test LOC ≥ 100 or total LOC ≥ 400 must keep tests in a sibling `{name}_tests.rs` file. Production file contains only the 3-line stub (attribute order matters):
  ```
  #[cfg(test)]
  #[path = "{name}_tests.rs"]
  mod tests;
  ```
  `{name}_tests.rs` starts with `#![cfg(test)]` (inner attribute) + `use super::*;`. When merging multiple test mods into one sibling file (e.g. `models_tests.rs`), use nested `mod foo_tests { use super::super::*; … }`. Below threshold → inline `mod tests {}` is fine. Enforcement: `scripts/check-rust-test-pattern.mjs` (lint-staged, `src-tauri/**/*.rs`). **Changing this rule = update both CLAUDE.md and the script in the same commit.**

### TypeScript
- `strict: true`, `noUnusedLocals`, `noUnusedParameters`. Remove unused imports.
- `types.ts` → pure type defs, zero runtime deps. `state.ts` → getters/setters only.
- `main.ts` → `init()` + event listeners; business logic belongs in modules.
- Tauri event payloads: `listen("…", (event: unknown) => { const e = event as { payload: T }; … })`.
- Import order (no cycles): Types → Utils → Features → State → Main.
- Dev-only: `if (import.meta.env.DEV) { await import('./dev/…'); }`.
- UI changes: `index.html` (DOM) + `src/styles/*.css` + `src/**/*.ts`. On removal, purge listeners, state refs, CSS.

### CSS
- Vanilla CSS, glassmorphism. One file per component, linked from `index.html`.
- Layout stack: titlebar (32px) → navbar (40px) → content → XP bar (4px, `bottom:59px; z-index:901`) → footer (59px). Side panels: `top:72px; bottom:63px`.
- **새 `position: fixed` 요소 추가 시**: (1) 그 위 스크롤 컨테이너에 동량 `padding-bottom`/`padding-top`을 **같은 PR에서** 추가 — fixed는 layout flow 밖이지만 hit-test/시각은 그대로 막는다. (2) z-index 충돌(특히 XP bar=901) 회피. (3) `prefers-reduced-motion` 가드 점검. (사례: lesson 2026-05-11 fixed-bottom-overlay)

## Pitfalls
- **Rust**: forgetting `use tauri::Manager` after splitting a commands module.
- **TS circular imports** return `undefined` at runtime — use getter functions from `state.ts`.
- **Backend reset/contract 변경 시 frontend 캐시·debounce 큐 동시 무효화 필수**: `state.ts` 캐시, `CanvasManager._*` 내부 카운터, in-flight `scheduleSave*`를 모두 fence. backend 단독 reset은 다음 사용자 입력에서 stale write-back으로 되돌아온다. (사례: lesson 2026-04-30 frontend-cache-overrides-backend-reset)
- **Frontend 단일 분기로 backend 병렬 경로 차단 금지**: SP 업그레이드 ↔ 자동 레벨링처럼 backend에서 **병행 가능한** 경로를 frontend `Set` 한 줄로 배제하면 contract와 어긋난다. `upgrade-defs.ts`의 `cost`/`unlockHint`가 SP 경로 존재의 진실값. (사례: lesson 2026-05-11 auto-leveling-not-exclusive-with-sp-upgrade)
- **CI/외부 액션 디버깅 시 push-to-test 금지**: 첫 fail에서 즉시 로컬 dry-run 또는 문서 정독. "에러 메시지가 매번 다르면 같은 함정의 다른 layer" 가정 — 다중 failure-mode를 한 번에 매핑한 뒤 한 번에 push. loop budget non-negotiable의 사각지대다. (사례: lesson 2026-05-09 dorny-paths-filter 3중 함정)
- **Linux build** needs `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`, `libxi-dev`, `libxtst-dev`.
- **Vite dev port**: must be 1420 (HMR 1421). Tauri expects it.
- **Release ≠ dev**: `import.meta.env.DEV` separates overlays from core. Don't mix.
- **blockLog stores rendered color**, not palette entry — replay is idempotent.
- **`vendor/rdev/`**: patched fork. Do not modify without testing macOS CGEventTap.

## CI / Docs
- CI: `tsc --noEmit` (advisory) + `i18n:validate` (blocking, 8-stage strict).
- `docs/architecture.md` auto-regenerates via pre-commit hook (`scripts/generate-architecture.sh`). Design docs live in `docs/` (skill tree, brush, emoji, gallery, god mode, rebirth). `docs/.archive`는 무시(legacy).
- i18n: `docs/i18n-style-guide.md`, `docs/i18n-glossary.md`. PR template enforces i18n checklist; CODEOWNERS auto-requests review on catalog/tooling changes.

## Harness
모든 feature 변경은 `docs/harness/HARNESS_OPERATING_PLAYBOOK.md` 진입. Medium+ tier는 `/harness-start {feat-name}` 필수 — Decision Ledger(`docs/feat_{name}_harness_ledger.md`) 초기화 + Phase 오케스트레이션 + 완료 후 Retrospective. 용어는 `docs/harness/GLOSSARY.md`.

**Hooks 동작 요약**: `PreToolUse(Bash)` destructive/force-push deny, `PreToolUse(Edit|Write)` 프라이버시 가드, `Stop` 필수 harness 문서 검증. 전체 인벤토리·skills 목록·세부 동작은 `docs/harness/README.md`. 검증 `npm run hooks:test`. Strict mode `PIXEL_HORIZON_STRICT_STOP=1`.

**Non-negotiables** (SessionStart hook이 매 세션 주입, 여기에도 명시): aggregate-only 입력 · 프라이버시 스크러버 · 라이프사이클 정리 · 영속 스키마/마이그레이션 증거+롤백 · loop budget (동일 실패 auto-fix 3회 / 무변경 rerun 2회 도달 시 stop & ask).

## Performance budget
Idle CPU < 1%, memory < 50 MB. Event-driven; no polling loops.

## Design Workflow
복잡 기능은 Stage 0 (아이데이션) → 1 (기능 설계) → 2 (구현 계획). 규칙 원본 `.claude-context/design-rule.md`. 트리거 `/stage-start {N} [feat-name]` · `/stage-end {N}`. 산출물 `docs/feat_{feat-name}_s{N}.md`.

## Planning Rules (사용자 지침)
- **계획(Plan)에 코드를 절대 포함하지 않는다.** 파일 경로, 수정 방향, 로직 설명만 서술. 코드는 구현 단계에서만.
- 계획은 간결하게: 파일별 변경 사항을 1~2줄로 요약. 불필요한 반복 금지.
- 좋은 예: `src/state.ts — getLevel() 반환값에 rebirth 보정 로직 추가`
- 나쁜 예: 위 항목에 실제 함수 구현 코드까지 포함
- 위 규칙은 Stage 1·2 동안 그대로 활성 — Design Workflow의 하위 규칙으로 작동.

## Plan Review (Gemini MCP)
`.mcp.json`의 `gemini-review` → `review_plan({ path, focus? })`. **외부 전송 경고**: `path` 본문이 Google Gemini로 송신됨 — 자격증명·원본 입력·내부 경로 파일 사용 금지. 키 `.claude/.gemini-key` (chmod 600, gitignored) 또는 `GEMINI_API_KEY` env. 셋업 `cd .claude/mcp/gemini-review && npm install`.

## Token optimization (AI 지침)
탐색은 `docs/architecture.md` 우선(Glob/Grep 반복 최소화) · 대규모 파일은 offset/limit으로 부분 읽기 · `dispatch_skill!` 매크로 사용(20-arm match 직접 작성 금지) · 진행 상황 출력 최소화, 결과만 보고.
