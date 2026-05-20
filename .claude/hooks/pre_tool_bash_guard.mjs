// @portable
import { readFileSync } from "node:fs";
import { emitDecision } from "./_emit.mjs";

const raw = readFileSync(0, "utf8");
let event;
try {
  event = JSON.parse(raw);
} catch {
  process.exit(0);
}

const command = String(event?.tool_input?.command ?? "");

const denyPatterns = [
  /\brm\s+-rf\b/i,
  /\bRemove-Item\b.*\b-Recurse\b.*\b-Force\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-fd/i,
  /\bgit\s+push\b[^\n]*\s--force(?!-with-lease)\b/i,
  /\bgit\s+push\b[^\n]*\s-f\b/i,
  /\bgit\s+push\b[^\n]*\s\+\S/i,
  /\bInvoke-Expression\b/i,
  /\biex\b/i,
  /\bcurl\b.*\|\s*(sh|bash|powershell|pwsh)/i,
  /\biwr\b.*\|\s*(iex|powershell|pwsh)/i,
  /\bInvoke-WebRequest\b.*\|\s*(Invoke-Expression|iex|powershell|pwsh)/i,
];

for (const pattern of denyPatterns) {
  if (pattern.test(command)) {
    emitDecision(
      "deny",
      "Bash guard: command blocked because it is destructive or executes remote/untrusted code. Ask the user for an explicit safer path.",
    );
  }
}

const askPatterns = [
  /\bsetx\b/i,
  /\bgh\s+pr\s+merge\b/i,
  /\bnpm\s+install\b/i,
  /\bpip\s+install\b/i,
  /\bcargo\s+install\b/i,
  /\bwinget\b/i,
  /\bchoco\b/i,
];

for (const pattern of askPatterns) {
  if (pattern.test(command)) {
    emitDecision(
      "ask",
      "Bash guard: command may change external state, install dependencies, or publish changes. Confirm before running.",
    );
  }
}
