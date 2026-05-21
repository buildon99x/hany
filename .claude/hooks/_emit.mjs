// @portable
// Shared emit helpers for harness hooks. Each helper writes canonical
// Claude Code hook JSON to stdout and exits 0.

export function emitAdvisory(hookEventName, additionalContext) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName, additionalContext },
    }),
  );
  process.exit(0);
}

// PreCompact does not support hookSpecificOutput — use top-level systemMessage instead.
export function emitSystemMessage(systemMessage) {
  process.stdout.write(JSON.stringify({ systemMessage }));
  process.exit(0);
}

// For PreToolUse hooks that need a deny/ask permission decision.
export function emitDecision(permissionDecision, permissionDecisionReason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision,
        permissionDecisionReason,
      },
    }),
  );
  process.exit(0);
}
