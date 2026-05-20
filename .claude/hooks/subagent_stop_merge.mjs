// @portable
import { emitAdvisory } from "./_emit.mjs";
import { getStrictMode } from "./_config.mjs";

const message = `Subagent handoff requirement:
- Summarize changed files.
- Summarize verification performed.
- List unresolved UX, privacy, resident stability, recovery, migration, security, or harness drift risks.
- Do not mark work complete unless the parent task can update the Feature Quality Note or Work Status snapshot.`;

if (getStrictMode()) {
  process.stdout.write(JSON.stringify({ decision: "block", reason: message }));
} else {
  emitAdvisory("SubagentStop", message);
}
