#!/usr/bin/env node
// Real-time TUI dashboard for harness work state.
// Reads docs/spec/*_harness_ledger.md and re-renders on change.
// Isolation: no hooks, no SessionStart, no auto-spawn — manual invocation only.
// Aggregate-only output: counts/status/sha7/timestamps. Source ledgers are
// already privacy-scrubbed (Footnote 3); this tool adds no new data.

import { readdirSync, readFileSync, existsSync, statSync, watch } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseLedger, countTriggerTagsSince } from './lib/ledger-parser.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SPEC_DIR = join(ROOT, 'docs', 'spec');

const DEBOUNCE_MS = 200;
const POLL_FALLBACK_MS = 5000;
const ADVISORY_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 5;

const TRACKED_TAGS = [
  'pre-grep',
  'delegation-mode',
  'verify-tag',
  'subagent-verify',
];

function parseArgs(argv) {
  const opts = {
    once: false,
    limit: DEFAULT_LIMIT,
    ascii: null,
    help: false,
  };
  for (const arg of argv) {
    if (arg === '--once') opts.once = true;
    else if (arg === '--ascii') opts.ascii = true;
    else if (arg === '--no-ascii') opts.ascii = false;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg.startsWith('--limit=')) {
      const n = parseInt(arg.slice('--limit='.length), 10);
      if (!Number.isNaN(n) && n > 0) opts.limit = n;
    }
  }
  return opts;
}

function autoDetectAscii() {
  if (process.env.NO_COLOR) return true;
  if (process.env.TERM === 'dumb') return true;
  if (!process.stdout.isTTY) return true;
  return false;
}

function printHelp() {
  process.stdout.write([
    'harness-watch — real-time TUI dashboard for harness work state',
    '',
    'Usage: node scripts/harness-watch.mjs [flags]',
    '       npm run harness:watch',
    '',
    'Flags:',
    '  --once         Render once and exit (auto-enabled in non-TTY)',
    '  --limit=N      Show top N active features (default 5)',
    '  --ascii        Force ASCII mode (also: NO_COLOR=1, TERM=dumb)',
    '  --no-ascii     Force ANSI/color mode',
    '  --help, -h     Print this help',
    '',
    'Keys (interactive):  [q]uit  [d]etail  [a]scii  [?]help',
    '',
  ].join('\n'));
}

function listLedgers() {
  if (!existsSync(SPEC_DIR)) return [];
  const out = [];
  for (const name of readdirSync(SPEC_DIR)) {
    if (!name.endsWith('_harness_ledger.md')) continue;
    const featName = name.slice(0, -'_harness_ledger.md'.length);
    const ledgerPath = join(SPEC_DIR, name);
    const retroPath = join(SPEC_DIR, `${featName}_harness_retrospective.md`);
    if (existsSync(retroPath)) continue;
    out.push({ featName, ledgerPath });
  }
  return out;
}

function readState() {
  const entries = listLedgers();
  const features = [];
  let advisoryAnyMissingIso = false;
  const advisoryCounts = {};
  for (const t of TRACKED_TAGS) advisoryCounts[t] = 0;
  const now = Date.now();
  const since = now - ADVISORY_WINDOW_MS;

  for (const { featName, ledgerPath } of entries) {
    let content = '';
    let mtimeMs = 0;
    try {
      content = readFileSync(ledgerPath, 'utf8');
      mtimeMs = statSync(ledgerPath).mtimeMs;
    } catch {
      continue;
    }
    let parsed;
    try {
      parsed = parseLedger(content, featName);
    } catch {
      features.push({ featName, parseError: true, mtimeMs });
      continue;
    }
    if (parsed.status !== 'active') continue;

    const activePhase = parsed.phases.find(p => p.statusEmoji === '🟡')
      || parsed.phases.find(p => p.statusEmoji === '🔲')
      || parsed.phases[parsed.phases.length - 1];

    const loopForActive = activePhase
      ? parsed.loopBudget.find(b => b.phase === activePhase.title.split('—')[0].trim())
      : null;

    const { counts, anyMissingIso } = countTriggerTagsSince(parsed.decisionLog, since, now);
    if (anyMissingIso) advisoryAnyMissingIso = true;
    for (const k of Object.keys(counts)) {
      if (Object.prototype.hasOwnProperty.call(advisoryCounts, k)) {
        advisoryCounts[k] += counts[k];
      }
    }

    features.push({
      featName,
      tier: parsed.tier || 'n/a',
      activePhase: activePhase
        ? { num: activePhase.phaseNum, title: activePhase.title, emoji: activePhase.statusEmoji }
        : null,
      loopBudget: loopForActive
        ? { autoFix: loopForActive.autoFix, sameInput: loopForActive.sameInput, phase: loopForActive.phase }
        : null,
      decisionLastRow: parsed.decisionLog[parsed.decisionLog.length - 1] || null,
      subagentLastRow: parsed.subagentInvocations[parsed.subagentInvocations.length - 1] || null,
      mtimeMs,
      parseError: false,
    });
  }

  features.sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0));

  return {
    features,
    advisoryCounts,
    advisoryAnyMissingIso,
    branch: gitBranch(),
    lastCommit: gitLastCommit(),
    now,
  };
}

function gitBranch() {
  const r = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) return 'n/a';
  return (r.stdout || '').trim() || 'n/a';
}

function gitLastCommit() {
  const r = spawnSync('git', ['log', '-1', '--pretty=format:%h\t%s\t%ar'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) return null;
  const [sha7, subject, when] = (r.stdout || '').split('\t');
  if (!sha7) return null;
  return { sha7, subject, when };
}

function relativeFromMs(ms, now) {
  if (!ms) return 'never';
  const diff = Math.max(0, now - ms);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function formatHHMMSS(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function render(state, opts) {
  const ascii = opts.ascii;
  const lines = [];

  const wallclock = formatHHMMSS(new Date(state.now));
  lines.push(`harness-watch · ${state.branch} · ${wallclock}`);
  lines.push('');

  const visible = state.features.slice(0, opts.limit);
  const overflow = state.features.length - visible.length;
  lines.push(`Active features (${state.features.length})`);
  if (state.features.length === 0) {
    lines.push('  No active features. Waiting for docs/spec/*_harness_ledger.md ...');
  } else {
    for (const f of visible) {
      if (f.parseError) {
        const badge = ascii ? '[!!]' : '⚠️';
        lines.push(`  ${badge} ${f.featName} parse error`);
        continue;
      }
      const phase = f.activePhase
        ? `${f.activePhase.title.split('—')[0].trim()} ${ascii ? statusBadge(f.activePhase.emoji) : f.activePhase.emoji}`
        : 'no phase';
      const updated = relativeFromMs(f.mtimeMs, state.now);
      lines.push(`  ${ascii ? '>' : '▸'} ${f.featName} (${f.tier || 'n/a'}) | ${phase} | ${updated}`);
      if (opts.detail) {
        if (f.decisionLastRow) {
          lines.push(`      decision: ${truncate(f.decisionLastRow.decision, 70)}`);
        }
        if (f.subagentLastRow) {
          lines.push(`      subagent: ${f.subagentLastRow.agentId} ${f.subagentLastRow.status}`);
        }
      }
    }
    if (overflow > 0) lines.push(`  ... +${overflow} more (use --limit=N)`);
  }
  lines.push('');

  lines.push('Loop Budget');
  let anyLoop = false;
  for (const f of visible) {
    if (f.parseError || !f.loopBudget) continue;
    anyLoop = true;
    const lb = f.loopBudget;
    const af = lb.autoFix;
    const critical = isCriticalRatio(af);
    const mark = critical ? (ascii ? '*' : '✱') : ' ';
    lines.push(`  ${mark} ${f.featName} Phase ${lb.phase}: ${af}`);
  }
  if (!anyLoop) lines.push('  (no active phases)');
  lines.push('');

  lines.push('Advisory triggers (last 60min)');
  const adv = TRACKED_TAGS.map(t => `[${t}] ${state.advisoryCounts[t] || 0}`).join('  ');
  lines.push(`  ${adv}${state.advisoryAnyMissingIso ? '  (since start: some rows lack ISO timestamp)' : ''}`);
  lines.push('');

  lines.push('Last commit');
  if (state.lastCommit) {
    lines.push(`  ${state.lastCommit.sha7} ${truncate(state.lastCommit.subject, 60)} (${state.lastCommit.when})`);
  } else {
    lines.push('  n/a');
  }
  lines.push('');

  lines.push(' [q]uit  [d]etail  [a]scii  [?]help');

  return lines.join('\n') + '\n';
}

function isCriticalRatio(s) {
  const m = String(s || '').match(/^(\d+)\/(\d+)$/);
  if (!m) return false;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  return b > 0 && a / b >= 2 / 3;
}

function statusBadge(emoji) {
  switch (emoji) {
    case '✅': return '[OK]';
    case '🟡': return '[..]';
    case '🔲': return '[ ]';
    case '⏸': return '[||]';
    case '⚠️': return '[!!]';
    default: return '[?]';
  }
}

function truncate(s, n) {
  if (!s) return '';
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

function hideCursor() {
  process.stdout.write('\x1b[?25l');
}

function showCursor() {
  process.stdout.write('\x1b[?25h');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  if (opts.ascii === null) opts.ascii = autoDetectAscii();
  if (!process.stdout.isTTY) opts.once = true;

  opts.detail = false;

  if (opts.once) {
    const state = readState();
    process.stdout.write(render(state, opts));
    return;
  }

  let cleaned = false;
  let watcher = null;
  let pollTimer = null;
  let debounceTimer = null;

  const cleanup = (code = 0) => {
    if (cleaned) return;
    cleaned = true;
    if (debounceTimer) clearTimeout(debounceTimer);
    if (pollTimer) clearInterval(pollTimer);
    if (watcher) { try { watcher.close(); } catch { /* ignore */ } }
    if (process.stdin.isTTY && process.stdin.setRawMode) {
      try { process.stdin.setRawMode(false); } catch { /* ignore */ }
    }
    try { process.stdin.pause(); } catch { /* ignore */ }
    if (!opts.ascii) showCursor();
    process.exit(code);
  };

  for (const sig of ['SIGINT', 'SIGTERM', 'SIGBREAK', 'SIGHUP']) {
    process.on(sig, () => cleanup(0));
  }
  process.on('SIGPIPE', () => cleanup(0));
  process.stdout.on('error', err => {
    if (err && err.code === 'EPIPE') cleanup(0);
  });

  const draw = () => {
    if (cleaned) return;
    const state = readState();
    if (!opts.ascii) hideCursor();
    clearScreen();
    process.stdout.write(render(state, opts));
  };

  const schedule = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(draw, DEBOUNCE_MS);
  };

  try {
    watcher = watch(SPEC_DIR, { persistent: true }, (_event, _name) => schedule());
    watcher.on('error', () => {
      try { watcher.close(); } catch { /* ignore */ }
      watcher = null;
      pollTimer = setInterval(draw, POLL_FALLBACK_MS);
    });
  } catch {
    pollTimer = setInterval(draw, POLL_FALLBACK_MS);
  }

  if (process.stdin.isTTY && process.stdin.setRawMode) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', key => {
      if (key === '' || key === 'q') { cleanup(0); return; }
      if (key === 'd') { opts.detail = !opts.detail; draw(); return; }
      if (key === 'a') { opts.ascii = !opts.ascii; draw(); return; }
      if (key === '?') { opts.detail = !opts.detail; draw(); return; }
    });
  }

  draw();
}

main().catch(err => {
  process.stderr.write(`harness-watch: ${err && err.message ? err.message : String(err)}\n`);
  process.exit(1);
});
