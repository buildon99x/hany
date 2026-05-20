// @project-specific(pixel-horizon input identifiers — keyCode/mouseX/cursorPath/etc.)
import { readFileSync } from "node:fs";
import { emitDecision } from "./_emit.mjs";

const raw = readFileSync(0, "utf8");
let event;
try {
  event = JSON.parse(raw);
} catch {
  process.exit(0);
}

const input = event?.tool_input ?? {};
const filePath = String(input.file_path ?? "");
const sourceExt = /\.(ts|tsx|rs|js|mjs|cjs|jsx)$/i;
if (filePath && !sourceExt.test(filePath)) {
  process.exit(0);
}

const content = String(input.content ?? input.new_string ?? "");
if (content.length === 0) {
  process.exit(0);
}

const forbidden = [
  "keyCode",
  "key_code",
  "rawKey",
  "raw_key",
  "typedText",
  "typed_text",
  "inputText",
  "input_text",
  "mouseX",
  "mouseY",
  "cursorPath",
  "cursor_path",
  "windowTitle",
  "window_title",
  "appSpecificInput",
  "app_specific_input",
];

const hits = forbidden.filter((term) =>
  new RegExp(`\\b${term}\\b`).test(content),
);

if (hits.length === 0) {
  process.exit(0);
}

const reason = `Privacy guard: potential raw input identifiers detected in source edit: ${hits.join(", ")}. Use aggregate-only counts/rates/durations/coarse buckets, or document an explicit privacy review before proceeding.`;

emitDecision("ask", reason);
