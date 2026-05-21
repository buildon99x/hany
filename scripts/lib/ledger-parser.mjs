// Parses docs/spec/*_harness_ledger.md into structured objects.
// 5 sections + frontmatter: Phase Status / Loop Budget / Decision Log /
// Subagent Invocations / Effort. Aggregate-only, no scrub needed (ledger is
// already privacy-clean by Footnote 3).
//
// All functions are pure (input string → object). No filesystem, no spawn.

const ISO8601_RE = /(\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?)/;

export function parseFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 4);
  if (end < 0) return null;
  const block = content.slice(4, end);
  const fm = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].trim();
  }
  return fm;
}

function extractSection(content, heading) {
  const re = new RegExp(`##\\s+${heading}([\\s\\S]*?)(?=\\n##\\s|$)`);
  const m = content.match(re);
  return m ? m[1] : '';
}

export function parsePhaseStatus(content) {
  const section = extractSection(content, 'Phase Status');
  const rows = [];
  for (const line of section.split('\n')) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]*)\|/);
    if (!m) continue;
    const statusRaw = m[3].trim();
    let statusEmoji = '🔲';
    for (const e of ['✅', '🟡', '⏸', '⚠️', '🔲']) {
      if (statusRaw.includes(e)) { statusEmoji = e; break; }
    }
    rows.push({
      phaseNum: m[1].trim(),
      title: m[2].trim(),
      statusEmoji,
      statusRaw,
      commit: m[4].trim() || '—',
    });
  }
  return rows;
}

export function parseLoopBudget(content) {
  const section = extractSection(content, 'Loop Budget Tracker');
  const rows = [];
  for (const line of section.split('\n')) {
    const m = line.match(/^\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]*)\|/);
    if (!m) continue;
    const phase = m[1].trim();
    if (!phase || phase === 'Phase' || /^[-:]+$/.test(phase)) continue;
    rows.push({
      phase,
      autoFix: m[2].trim(),
      sameInput: m[3].trim(),
      stop: m[4].trim(),
    });
  }
  return rows;
}

export function parseDecisionLog(content) {
  const section = extractSection(content, 'Decision Log');
  const rows = [];
  for (const line of section.split('\n')) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]*)\|/);
    if (!m) continue;
    const dateRaw = m[2].trim();
    const isoMatch = dateRaw.match(ISO8601_RE);
    const reason = m[5].trim();
    const triggerTags = [...reason.matchAll(/\[([a-z][a-z0-9-]*-trigger)\]/g)].map(t => t[1]);
    rows.push({
      num: m[1].trim(),
      date: dateRaw,
      iso: isoMatch ? isoMatch[1] : null,
      phase: m[3].trim(),
      decision: m[4].trim(),
      reason,
      triggerTags,
      commit: m[6].trim(),
    });
  }
  return rows;
}

export function parseSubagentInvocations(content) {
  const section = extractSection(content, 'Subagent Invocations');
  const rows = [];
  for (const line of section.split('\n')) {
    const m = line.match(/^\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]*)\|/);
    if (!m) continue;
    const date = m[1].trim();
    if (!date || date === 'Date' || /^[-:]+$/.test(date)) continue;
    rows.push({
      date,
      phase: m[2].trim(),
      agentId: m[3].trim(),
      task: m[4].trim(),
      durationMs: m[5].trim(),
      totalTokens: m[6].trim(),
      toolUses: m[7].trim(),
      status: m[8].trim(),
    });
  }
  return rows;
}

export function parseLedger(content, featName) {
  const fm = parseFrontmatter(content) || {};
  return {
    featName,
    frontmatter: fm,
    status: fm.status || 'unknown',
    tier: matchInline(content, /\*\*Tier\*\*[:\s]+([^\n]+)/),
    branch: matchInline(content, /\*\*Branch\*\*[:\s]+`?([^`\n]+)`?/),
    phases: parsePhaseStatus(content),
    loopBudget: parseLoopBudget(content),
    decisionLog: parseDecisionLog(content),
    subagentInvocations: parseSubagentInvocations(content),
  };
}

function matchInline(content, re) {
  const m = content.match(re);
  return m ? m[1].trim().replace(/`/g, '') : null;
}

export function countTriggerTagsSince(decisionRows, sinceMs, nowMs) {
  const counts = {};
  let anyMissingIso = false;
  for (const row of decisionRows) {
    if (!row.triggerTags.length) continue;
    let inWindow;
    if (row.iso) {
      const t = Date.parse(row.iso);
      inWindow = !Number.isNaN(t) && t >= sinceMs && t <= nowMs;
    } else {
      anyMissingIso = true;
      inWindow = true;
    }
    if (!inWindow) continue;
    for (const tag of row.triggerTags) {
      const key = tag.replace(/-trigger$/, '');
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return { counts, anyMissingIso };
}
