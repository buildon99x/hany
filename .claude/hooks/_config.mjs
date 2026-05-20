// @portable
// Shared config loader for harness hooks. Reads harness-loop.config.json from
// the repository root. Hooks invoke loadHarnessConfig() once at startup; on
// failure (missing file, invalid JSON), returns null and the caller must fall
// back to inline defaults so a broken config never breaks the hook itself.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CONFIG_PATH = resolve(process.cwd(), "harness-loop.config.json");

let _cfg; // undefined = not yet loaded; null = loaded but failed/missing

export function loadHarnessConfig() {
  if (_cfg !== undefined) return _cfg;
  try {
    _cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    _cfg = null;
  }
  return _cfg;
}

export function getRequiredDocs(fallback) {
  const cfg = loadHarnessConfig();
  const list = cfg?.required_docs;
  return Array.isArray(list) && list.length > 0 ? list : fallback;
}

export function getStrictMode() {
  if (process.env.PIXEL_HORIZON_STRICT_STOP === "1") return true;
  if (process.env.PIXEL_HORIZON_STRICT_STOP === "0") return false;
  const cfg = loadHarnessConfig();
  return cfg?.strict_mode_default === true;
}
