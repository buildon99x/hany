#!/usr/bin/env node
// Harness Effort Ledger row aggregator.
// Reads session JSONL files, filters by branch + cwd + Phase window,
// aggregates per-Phase active turn time + 5-way token usage, and writes a
// single row into the ledger's `<!-- effort:auto:begin -->` … `<!-- effort:auto:end -->`
// sentinel region (in-place, body outside the markers preserved).
// See docs/feat_harness-improve-logbase_s1.md §1-§4 for the contract.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { adaptFile } from './lib/transcript-adapter.mjs';
import { assertNoSentinels } from './lib/scrubber.mjs';

const EXIT = { OK: 0, USAGE: 3 };

function usage() {
  return [
    'usage: harness-effort-collect --ledger <path> --phase <key> --branch <name>',
    '                              [--since <iso>] [--until <iso>]',
    '                              [--projects-dir <path>] [--repo-root <path>]',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--ledger') opts.ledger = argv[++i];
    else if (a === '--phase') opts.phase = argv[++i];
    else if (a === '--branch') opts.branch = argv[++i];
    else if (a === '--since') opts.since = argv[++i];
    else if (a === '--until') opts.until = argv[++i];
    else if (a === '--projects-dir') opts.projectsDir = argv[++i];
    else if (a === '--repo-root') opts.repoRoot = argv[++i];
    else if (a === '--help' || a === '-h') opts.help = true;
  }
  return opts;
}

function defaultProjectsDir(repoRoot) {
  const slug = repoRoot.replace(/[/\\]/g, '-');
  return path.join(os.homedir(), '.claude', 'projects', slug);
}

function readJsonlFirstLine(filePath) {
  try {
    const head = readFileSync(filePath, 'utf8').slice(0, 4096);
    const nl = head.indexOf('\n');
    const line = (nl >= 0 ? head.slice(0, nl) : head).trim();
    if (!line) return null;
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function fileMatchesContext(filePath, branch, repoRoot) {
  // Inspect any line that carries gitBranch/cwd metadata (first 20 lines is enough
  // to skip pure-attachment headers that lack the fields).
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    return false;
  }
  const lines = content.split('\n', 20);
  for (const line of lines) {
    if (!line) continue;
    let raw;
    try { raw = JSON.parse(line); } catch { continue; }
    const cwd = typeof raw.cwd === 'string' ? raw.cwd : null;
    const br = typeof raw.gitBranch === 'string' ? raw.gitBranch : null;
    if (!cwd && !br) continue;
    if (branch && br && br !== branch) return false;
    if (repoRoot && cwd && !cwd.startsWith(repoRoot)) return false;
    return true;
  }
  return false;
}

async function aggregate(opts) {
  const sinceMs = opts.since ? Date.parse(opts.since) : Number.NEGATIVE_INFINITY;
  const untilMs = opts.until ? Date.parse(opts.until) : Number.POSITIVE_INFINITY;
  const repoRoot = opts.repoRoot || process.cwd();
  const projectsDir = opts.projectsDir || defaultProjectsDir(repoRoot);

  const acc = {
    activeMs: 0,
    wallStartMs: Number.POSITIVE_INFINITY,
    wallEndMs: Number.NEGATIVE_INFINITY,
    usage_in: 0,
    usage_out: 0,
    usage_cc1h: 0,
    usage_cc5m: 0,
    usage_cr: 0,
    sessionIds: new Set(),
    eventCount: 0,
    fallback: false,
  };

  if (!existsSync(projectsDir)) {
    acc.fallback = true;
    return acc;
  }

  let entries;
  try { entries = readdirSync(projectsDir); }
  catch { acc.fallback = true; return acc; }
  const files = entries.filter((f) => f.endsWith('.jsonl'));
  if (files.length === 0) {
    acc.fallback = true;
    return acc;
  }

  for (const f of files) {
    const full = path.join(projectsDir, f);
    if (!fileMatchesContext(full, opts.branch, repoRoot)) continue;
    await adaptFile(full, (ev) => {
      if (typeof ev.ts_ms !== 'number') return;
      if (ev.ts_ms < sinceMs || ev.ts_ms > untilMs) return;
      acc.eventCount += 1;
      if (ev.session_id8) acc.sessionIds.add(ev.session_id8);
      if (ev.ts_ms < acc.wallStartMs) acc.wallStartMs = ev.ts_ms;
      if (ev.ts_ms > acc.wallEndMs) acc.wallEndMs = ev.ts_ms;
      if (ev.kind === 'assistant_turn') {
        if (Number.isFinite(ev.turn_interval_ms)) acc.activeMs += ev.turn_interval_ms;
        acc.usage_in += ev.usage_in || 0;
        acc.usage_out += ev.usage_out || 0;
        acc.usage_cc1h += ev.usage_cc1h || 0;
        acc.usage_cc5m += ev.usage_cc5m || 0;
        acc.usage_cr += ev.usage_cr || 0;
      }
    });
  }

  if (acc.eventCount === 0) acc.fallback = true;
  return acc;
}

function formatRow(phase, acc) {
  if (acc.fallback) {
    return `| ${phase} | n/a | n/a | n/a | n/a | n/a | n/a | n/a | |`;
  }
  const activeMin = (acc.activeMs / 60000).toFixed(1);
  const wallMin = Math.max(0, Math.round((acc.wallEndMs - acc.wallStartMs) / 60000));
  const k = (n) => Math.round(n / 1000);
  return `| ${phase} | ${activeMin} | ${wallMin} | ${k(acc.usage_in)} | ${k(acc.usage_out)} | ${k(acc.usage_cc1h)} | ${k(acc.usage_cc5m)} | ${k(acc.usage_cr)} | |`;
}

const HEADER_LINES = [
  '| Phase | Active turn (min) | Wall (min) | In(k) | Out(k) | CC1h(k) | CC5m(k) | CR(k) | Mark |',
  '|---|---|---|---|---|---|---|---|---|',
];

function mergeRow(existingBody, phase, newRow, sessionIds) {
  // Parse existing rows (after header) preserving non-target rows.
  const lines = existingBody.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows = [];
  let footer = '';
  for (const line of lines) {
    if (line.startsWith('| Phase ') || line.startsWith('|---')) continue;
    if (line.startsWith('Sessions:')) { footer = line; continue; }
    if (line.startsWith('| ')) rows.push(line);
  }
  const targetPrefix = `| ${phase} |`;
  const filtered = rows.filter((r) => !r.startsWith(targetPrefix) && !r.startsWith('| Σ |'));
  filtered.push(newRow);
  // Footer: sessionId8 union (existing + new), comma-separated, sorted.
  const existingIds = footer
    ? new Set(footer.replace('Sessions:', '').split(',').map((s) => s.trim()).filter(Boolean))
    : new Set();
  for (const id of sessionIds) existingIds.add(id);
  const footerLine = existingIds.size > 0
    ? `Sessions: ${[...existingIds].sort().join(', ')}`
    : '';
  return { rows: filtered, footer: footerLine };
}

function renderBody(rows, footer) {
  const out = [...HEADER_LINES, ...rows];
  if (footer) out.push('', footer);
  return out.join('\n');
}

function updateLedger(ledgerPath, phase, acc) {
  const text = readFileSync(ledgerPath, 'utf8');
  const re = /(<!-- effort:auto:begin -->)([\s\S]*?)(<!-- effort:auto:end -->)/;
  const m = text.match(re);
  if (!m) {
    throw new Error(`ledger ${ledgerPath} has no effort:auto sentinel region`);
  }
  const row = formatRow(phase, acc);
  const { rows, footer } = mergeRow(m[2], phase, row, acc.sessionIds);
  const body = '\n' + renderBody(rows, footer) + '\n';
  const next = text.replace(re, `$1${body}$3`);
  assertNoSentinels(next, 'effort-collect ledger output');
  writeFileSync(ledgerPath, next, 'utf8');
  return { rows, footer, fallback: acc.fallback };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.ledger || !opts.phase) {
    process.stdout.write(usage() + '\n');
    process.exit(opts.help ? EXIT.OK : EXIT.USAGE);
  }
  const acc = await aggregate(opts);
  const res = updateLedger(opts.ledger, opts.phase, acc);
  if (res.fallback) {
    process.stderr.write(`[harness-effort] warn: no session events for ${opts.phase} → n/a row\n`);
  }
  process.exit(EXIT.OK);
}

if (import.meta.url === `file://${fileURLToPath(import.meta.url)}`) {
  main().catch((err) => {
    process.stderr.write(`[harness-effort] error: ${err.message}\n`);
    process.exit(EXIT.OK); // never block git commit; failures are advisory
  });
}

export { aggregate, formatRow, updateLedger, parseArgs };
