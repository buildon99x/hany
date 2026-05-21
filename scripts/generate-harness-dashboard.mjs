#!/usr/bin/env node
// Generates docs/harness/dashboard.html from docs/spec/*_harness_ledger.md files.
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SPEC_DIR = join(ROOT, 'docs', 'spec');
const OUT_DIR = join(ROOT, 'docs', 'harness');
const OUT_FILE = join(OUT_DIR, 'dashboard.html');

const ADVISORY_TAGS = [
  'pre-grep-trigger',
  'delegation-mode-trigger',
  'verify-tag-trigger',
  'subagent-verify-trigger',
  'subagent-metrics-trigger',
  'subagent-privacy-trigger',
];

const STATUS_EMOJI = {
  '🔲': { label: '미시작', color: '#6b7280' },
  '🟡': { label: '진행', color: '#ca8a04' },
  '✅': { label: '완료', color: '#16a34a' },
  '⚠️': { label: '회귀', color: '#ea580c' },
  '⏸': { label: '보류', color: '#2563eb' },
};

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseLedger(content, featName) {
  const result = {
    featName,
    tier: 'n/a',
    branch: 'n/a',
    phases: [],
    loopBudget: [],
    advisoryTags: {},
    effortRows: [],
    parseError: false,
  };

  try {
    // --- Tier & Branch ---
    const tierMatch = content.match(/\*\*Tier\*\*[:\s]+([^\n]+)/);
    if (tierMatch) result.tier = tierMatch[1].trim().replace(/`/g, '');

    const branchMatch = content.match(/\*\*Branch\*\*[:\s]+`?([^`\n]+)`?/);
    if (branchMatch) result.branch = branchMatch[1].trim().replace(/`/g, '');

    // --- Phase Status table ---
    // Find Phase Status section
    const phaseSection = content.match(/## Phase Status([\s\S]*?)(?=\n## |\n---|\Z|$)/);
    if (phaseSection) {
      const tableRows = phaseSection[1].matchAll(
        /^\|\s*(\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]*)\|/gm
      );
      for (const row of tableRows) {
        const phaseNum = row[1].trim();
        const title = row[2].trim();
        const statusRaw = row[3].trim();
        const commit = row[4].trim();

        // Find which emoji is in statusRaw
        let statusEmoji = '🔲';
        for (const emoji of Object.keys(STATUS_EMOJI)) {
          if (statusRaw.includes(emoji)) {
            statusEmoji = emoji;
            break;
          }
        }

        result.phases.push({ phaseNum, title, statusEmoji, commit: commit || '—' });
      }
    }

    // --- Loop Budget Tracker ---
    const loopSection = content.match(/## Loop Budget Tracker([\s\S]*?)(?=\n## |\n---|\Z|$)/);
    if (loopSection) {
      const tableRows = loopSection[1].matchAll(
        /^\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]*)\|/gm
      );
      for (const row of tableRows) {
        const phase = row[1].trim();
        const autoFix = row[2].trim();
        const sameInput = row[3].trim();
        const stop = row[4].trim();
        // Skip header rows
        if (phase === 'Phase' || phase === '---' || /^-+$/.test(phase)) continue;
        result.loopBudget.push({ phase, autoFix, sameInput, stop });
      }
    }

    // --- Advisory trigger tag counts ---
    for (const tag of ADVISORY_TAGS) {
      // Match [tag] occurrences (with or without spaces around)
      const re = new RegExp(`\\[${tag}\\]`, 'g');
      const matches = content.match(re);
      result.advisoryTags[tag] = matches ? matches.length : 0;
    }

    // --- Effort Ledger ---
    const effortMatch = content.match(
      /<!-- effort:auto:begin -->([\s\S]*?)<!-- effort:auto:end -->/
    );
    if (effortMatch) {
      const effortRows = effortMatch[1].matchAll(
        /^\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/gm
      );
      for (const row of effortRows) {
        const phase = row[1].trim();
        const activeTurn = row[2].trim();
        const wall = row[3].trim();
        const inK = row[4].trim();
        const outK = row[5].trim();
        // Skip header/separator rows
        if (phase === 'Phase' || /^-+$/.test(phase)) continue;
        result.effortRows.push({ phase, activeTurn, wall, inK, outK });
      }
    }
  } catch (e) {
    result.parseError = true;
    result.parseErrorMsg = e.message;
  }

  return result;
}

function renderBudgetBar(value) {
  // value like "0/3" or "0/2"
  const m = value.match(/^(\d+)\/(\d+)$/);
  if (!m) return escapeHtml(value);
  const used = parseInt(m[1], 10);
  const total = parseInt(m[2], 10);
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const color = pct === 0 ? '#374151' : pct < 67 ? '#ca8a04' : '#dc2626';
  return `<span class="bar-wrap"><span class="bar-fill" style="width:${pct}%;background:${color}"></span></span> ${escapeHtml(value)}`;
}

function renderFeatureCard(f) {
  if (f.parseError) {
    return `<div class="card error-card">
  <div class="card-header">
    <span class="feat-name">${escapeHtml(f.featName)}</span>
    <span class="badge badge-error">parse error</span>
  </div>
  <p class="error-msg">${escapeHtml(f.parseErrorMsg || 'unknown error')}</p>
</div>`;
  }

  // Phase status rows
  const phaseRows = f.phases.length === 0
    ? '<tr><td colspan="4" class="na">n/a</td></tr>'
    : f.phases.map(p => {
        const si = STATUS_EMOJI[p.statusEmoji] || { label: p.statusEmoji, color: '#6b7280' };
        return `<tr>
        <td>${escapeHtml(p.phaseNum)}</td>
        <td>${escapeHtml(p.title)}</td>
        <td><span class="status-badge" style="background:${si.color}">${p.statusEmoji} ${si.label}</span></td>
        <td class="commit">${escapeHtml(p.commit)}</td>
      </tr>`;
      }).join('\n');

  // Loop budget rows
  const budgetRows = f.loopBudget.length === 0
    ? '<tr><td colspan="4" class="na">n/a</td></tr>'
    : f.loopBudget.map(b => `<tr>
        <td>${escapeHtml(b.phase)}</td>
        <td class="bar-cell">${renderBudgetBar(b.autoFix)}</td>
        <td class="bar-cell">${renderBudgetBar(b.sameInput)}</td>
        <td>${escapeHtml(b.stop)}</td>
      </tr>`).join('\n');

  // Advisory tag chips
  const chips = ADVISORY_TAGS.map(tag => {
    const count = f.advisoryTags[tag] || 0;
    const cls = count > 0 ? 'chip chip-active' : 'chip chip-zero';
    return `<span class="${cls}" title="${escapeHtml(tag)}">[${escapeHtml(tag)}] × ${count}</span>`;
  }).join('\n');

  // Effort rows
  const effortRows = f.effortRows.length === 0
    ? '<tr><td colspan="5" class="na">n/a</td></tr>'
    : f.effortRows.map(e => `<tr>
        <td>${escapeHtml(e.phase)}</td>
        <td>${escapeHtml(e.activeTurn)}</td>
        <td>${escapeHtml(e.wall)}</td>
        <td>${escapeHtml(e.inK)}</td>
        <td>${escapeHtml(e.outK)}</td>
      </tr>`).join('\n');

  return `<div class="card">
  <div class="card-header">
    <span class="feat-name">${escapeHtml(f.featName)}</span>
    <span class="meta">Tier: <strong>${escapeHtml(f.tier)}</strong></span>
    <span class="meta">Branch: <code>${escapeHtml(f.branch)}</code></span>
  </div>

  <h3>Phase Status</h3>
  <table>
    <thead><tr><th>#</th><th>Phase</th><th>Status</th><th>Commit</th></tr></thead>
    <tbody>${phaseRows}</tbody>
  </table>

  <h3>Loop Budget</h3>
  <table>
    <thead><tr><th>Phase</th><th>Auto-fix attempts</th><th>Same-input reruns</th><th>Stop</th></tr></thead>
    <tbody>${budgetRows}</tbody>
  </table>

  <h3>Advisory Triggers</h3>
  <div class="chips">${chips}</div>

  <h3>Effort Ledger</h3>
  <table>
    <thead><tr><th>Phase</th><th>Active (min)</th><th>Wall (min)</th><th>In(k)</th><th>Out(k)</th></tr></thead>
    <tbody>${effortRows}</tbody>
  </table>
</div>`;
}

function generateHtml(features) {
  const generated = new Date().toISOString();
  const body = features.length === 0
    ? '<p class="empty">No features tracked yet.</p>'
    : features.map(renderFeatureCard).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Harness Monitor Dashboard</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
  background: #1a1a2e;
  color: #e2e8f0;
  padding: 2rem 1.5rem;
  min-height: 100vh;
}
h1 {
  font-size: 1.5rem;
  color: #a5b4fc;
  margin-bottom: 0.25rem;
}
.generated {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 2rem;
}
.card {
  background: #16213e;
  border: 1px solid #2d3748;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}
.error-card {
  border-color: #7f1d1d;
  background: #1c0a0a;
}
.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}
.feat-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #c7d2fe;
}
.meta { font-size: 0.8rem; color: #94a3b8; }
.meta strong { color: #e2e8f0; }
.meta code { background: #0f172a; padding: 0.1rem 0.4rem; border-radius: 0.25rem; font-size: 0.8rem; }
.badge { font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 9999px; font-weight: 600; }
.badge-error { background: #7f1d1d; color: #fca5a5; }
.error-msg { color: #fca5a5; font-size: 0.8rem; margin-top: 0.5rem; }
h3 { font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 1rem 0 0.5rem; }
table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
th { background: #0f172a; color: #64748b; text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #1e293b; }
td { padding: 0.4rem 0.6rem; border-bottom: 1px solid #1e293b; vertical-align: middle; }
tr:last-child td { border-bottom: none; }
.na { color: #4b5563; font-style: italic; text-align: center; }
.status-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  color: #fff;
  white-space: nowrap;
}
.commit { color: #64748b; font-family: monospace; font-size: 0.75rem; }
.bar-cell { white-space: nowrap; }
.bar-wrap {
  display: inline-block;
  width: 60px;
  height: 6px;
  background: #1e293b;
  border-radius: 3px;
  vertical-align: middle;
  margin-right: 6px;
  overflow: hidden;
}
.bar-fill {
  display: block;
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}
.chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.25rem; }
.chip {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  white-space: nowrap;
}
.chip-zero { background: #1e293b; color: #64748b; }
.chip-active { background: #7f1d1d; color: #fca5a5; font-weight: 700; }
.empty { color: #64748b; font-style: italic; }
</style>
</head>
<body>
<h1>Harness Monitor Dashboard</h1>
<p class="generated">Generated: ${generated}</p>
${body}
</body>
</html>`;
}

// --- Main ---
let ledgerFiles = [];
try {
  const entries = readdirSync(SPEC_DIR);
  ledgerFiles = entries.filter(f => f.endsWith('_harness_ledger.md'));
} catch {
  // SPEC_DIR doesn't exist yet — treat as 0 features
}

const features = ledgerFiles.map(filename => {
  const featName = filename.replace(/_harness_ledger\.md$/, '');
  try {
    const content = readFileSync(join(SPEC_DIR, filename), 'utf-8');
    return parseLedger(content, featName);
  } catch (e) {
    return { featName, parseError: true, parseErrorMsg: e.message, tier: 'n/a', branch: 'n/a', phases: [], loopBudget: [], advisoryTags: {}, effortRows: [] };
  }
});

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, generateHtml(features), 'utf-8');
console.log(`Dashboard written → ${OUT_FILE} (${features.length} feature(s))`);
