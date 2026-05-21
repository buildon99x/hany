#!/usr/bin/env node
// Plain Node test runner for scripts/harness-watch.mjs and lib/ledger-parser.mjs.
// Matches the project's `npm run hooks:test` pattern (scripts/test-hooks.mjs).
// No vitest dependency — see Scope Discovery Log entry (ledger).

import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

import {
  parseFrontmatter,
  parsePhaseStatus,
  parseLoopBudget,
  parseDecisionLog,
  parseSubagentInvocations,
  parseLedger,
  countTriggerTagsSince,
} from '../../scripts/lib/ledger-parser.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const WATCH_SCRIPT = join(ROOT, 'scripts', 'harness-watch.mjs');
const FIXTURES = join(__dirname, '__fixtures__');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write(`  ok  ${name}\n`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    process.stdout.write(`  FAIL  ${name}\n    ${err.message}\n`);
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'assertEqual'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertMatch(haystack, needle, msg) {
  if (typeof haystack !== 'string' || !haystack.includes(needle)) {
    throw new Error(`${msg || 'assertMatch'}: missing "${needle}" in:\n${haystack && haystack.slice(0, 500)}`);
  }
}

function assertNoMatch(haystack, needle, msg) {
  if (typeof haystack === 'string' && haystack.includes(needle)) {
    throw new Error(`${msg || 'assertNoMatch'}: unexpected "${needle}" in:\n${haystack.slice(0, 500)}`);
  }
}

function runWatch(args, env = {}) {
  return spawnSync('node', [WATCH_SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function withTempSpecDir(fixtures, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'harness-watch-'));
  const specDir = join(dir, 'docs', 'spec');
  mkdirSync(specDir, { recursive: true });
  try {
    for (const [name, content] of Object.entries(fixtures)) {
      writeFileSync(join(specDir, name), content);
    }
    fn(dir, specDir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// --- parseFrontmatter ---
process.stdout.write('parseFrontmatter\n');
test('reads status field', () => {
  const fm = parseFrontmatter('---\nstatus: active\nname: x\n---\n# body');
  assertEqual(fm.status, 'active');
  assertEqual(fm.name, 'x');
});
test('returns null when no frontmatter', () => {
  assertEqual(parseFrontmatter('# no fm'), null);
});
test('returns null when frontmatter is unclosed', () => {
  assertEqual(parseFrontmatter('---\nfoo: bar\n# never closed'), null);
});

// --- parsePhaseStatus ---
process.stdout.write('parsePhaseStatus\n');
const activeContent = readFileSync(join(FIXTURES, 'active.md'), 'utf8');
test('extracts 2 phases from fixture', () => {
  const phases = parsePhaseStatus(activeContent);
  assertEqual(phases.length, 2);
  assertEqual(phases[0].phaseNum, '1');
  assertEqual(phases[0].statusEmoji, '🟡');
  assertEqual(phases[1].statusEmoji, '🔲');
});

// --- parseLoopBudget ---
process.stdout.write('parseLoopBudget\n');
test('skips header/separator rows', () => {
  const lb = parseLoopBudget(activeContent);
  assertEqual(lb.length, 2);
  assertEqual(lb[0].phase, 'A');
  assertEqual(lb[0].autoFix, '2/3');
});

// --- parseDecisionLog + ISO8601 + trigger tags ---
process.stdout.write('parseDecisionLog\n');
test('extracts rows with ISO8601 timestamps', () => {
  const rows = parseDecisionLog(activeContent);
  assertEqual(rows.length, 2);
  assertEqual(rows[0].iso, '2026-05-21 11:00:00');
  assertEqual(rows[0].triggerTags.length, 1);
  assertEqual(rows[0].triggerTags[0], 'pre-grep-trigger');
});
test('row 2 has two verify-tag-trigger', () => {
  const rows = parseDecisionLog(activeContent);
  assertEqual(rows[1].triggerTags.length, 2);
});
test('scans both decision and reason columns', () => {
  const c = '## Decision Log\n\n| # | 날짜 | Phase | 결정 | 이유 | 커밋 |\n|---|---|---|---|---|---|\n| 1 | 2026-05-21 | A | x `[pre-grep-trigger]` | y `[verify-tag-trigger]` | abc |\n';
  const rows = parseDecisionLog(c);
  assertEqual(rows[0].triggerTags.length, 2);
});

// --- parseSubagentInvocations ---
process.stdout.write('parseSubagentInvocations\n');
test('empty table returns 0 rows', () => {
  const rows = parseSubagentInvocations(activeContent);
  assertEqual(rows.length, 0);
});

// --- parseLedger aggregator ---
process.stdout.write('parseLedger\n');
test('aggregates frontmatter + sections', () => {
  const parsed = parseLedger(activeContent, 'fixture-active');
  assertEqual(parsed.status, 'active');
  assertEqual(parsed.tier, 'Medium');
  assertEqual(parsed.phases.length, 2);
});

// --- countTriggerTagsSince ---
process.stdout.write('countTriggerTagsSince\n');
test('counts only rows within window', () => {
  const rows = parseDecisionLog(activeContent);
  const t0 = Date.parse('2026-05-21 10:00:00');
  const t1 = Date.parse('2026-05-21 12:00:00');
  const { counts } = countTriggerTagsSince(rows, t0, t1);
  assertEqual(counts['pre-grep'], 1);
  assertEqual(counts['verify-tag'], 2);
});
test('flags anyMissingIso for rows lacking timestamp', () => {
  const noIso = parseDecisionLog('## Decision Log\n\n| # | 날짜 | Phase | 결정 | 이유 | 커밋 |\n|---|---|---|---|---|---|\n| 1 | seed | A | x | `[pre-grep-trigger]` | abc |\n');
  const r = countTriggerTagsSince(noIso, 0, Date.now());
  assertEqual(r.anyMissingIso, true);
  assertEqual(r.counts['pre-grep'], 1);
});

// --- harness-watch --help ---
process.stdout.write('harness-watch --help\n');
test('exits 0 and prints flags', () => {
  const r = runWatch(['--help']);
  assertEqual(r.status, 0);
  assertMatch(r.stdout, '--once');
  assertMatch(r.stdout, '--ascii');
  assertMatch(r.stdout, '[q]uit');
});

// --- harness-watch --once with empty spec dir ---
process.stdout.write('harness-watch --once (no ledgers)\n');
test('renders empty state and exits 0', () => {
  withTempSpecDir({}, (dir, specDir) => {
    const r = spawnSync('node', [WATCH_SCRIPT, '--once'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1', HARNESS_WATCH_SPEC_DIR: specDir },
    });
    assertEqual(r.status, 0);
    assertMatch(r.stdout, 'No active features');
    assertMatch(r.stdout, 'Last commit');
  });
});

// --- harness-watch --once with active fixture ---
process.stdout.write('harness-watch --once (active fixture)\n');
test('renders 5 sections with active feature', () => {
  const activeFixture = readFileSync(join(FIXTURES, 'active.md'), 'utf8');
  const archivedFixture = readFileSync(join(FIXTURES, 'archived.md'), 'utf8');
  withTempSpecDir({
    'fixture-active_harness_ledger.md': activeFixture,
    'fixture-archived_harness_ledger.md': archivedFixture,
  }, (dir, specDir) => {
    const r = spawnSync('node', [WATCH_SCRIPT, '--once'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1', HARNESS_WATCH_SPEC_DIR: specDir },
    });
    assertEqual(r.status, 0);
    assertMatch(r.stdout, 'harness-watch');
    assertMatch(r.stdout, 'Active features (1)');
    assertMatch(r.stdout, 'fixture-active');
    assertNoMatch(r.stdout, 'fixture-archived');
    assertMatch(r.stdout, 'Loop Budget');
    assertMatch(r.stdout, 'Advisory triggers');
    assertMatch(r.stdout, 'Last commit');
  });
});

// --- NO_COLOR strips ANSI escapes ---
process.stdout.write('NO_COLOR ASCII mode\n');
test('no ANSI escape sequences in output', () => {
  const activeFixture = readFileSync(join(FIXTURES, 'active.md'), 'utf8');
  withTempSpecDir({
    'fixture-active_harness_ledger.md': activeFixture,
  }, (dir, specDir) => {
    const r = spawnSync('node', [WATCH_SCRIPT, '--once'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1', HARNESS_WATCH_SPEC_DIR: specDir },
    });
    assertEqual(r.status, 0);
    if (/\x1b\[/.test(r.stdout)) {
      throw new Error('found ANSI escape in NO_COLOR output');
    }
  });
});

// --- retrospective filters feature out ---
process.stdout.write('retrospective filters feature\n');
test('feature with retrospective is hidden', () => {
  const activeFixture = readFileSync(join(FIXTURES, 'active.md'), 'utf8');
  withTempSpecDir({
    'fixture-active_harness_ledger.md': activeFixture,
    'fixture-active_harness_retrospective.md': '# retro\n',
  }, (dir, specDir) => {
    const r = spawnSync('node', [WATCH_SCRIPT, '--once'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1', HARNESS_WATCH_SPEC_DIR: specDir },
    });
    assertEqual(r.status, 0);
    assertMatch(r.stdout, 'No active features');
  });
});

// --- non-TTY auto-once (pipe simulation) ---
process.stdout.write('non-TTY auto-once\n');
test('piped invocation exits without hanging', () => {
  const r = runWatch([], { NO_COLOR: '1' });
  assertEqual(r.status, 0);
  assertMatch(r.stdout, 'harness-watch');
});

// --- summary ---
process.stdout.write('\n');
process.stdout.write(`${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
