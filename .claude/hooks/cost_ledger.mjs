#!/usr/bin/env node
// @portable
// Stop hook — appends one cost-ledger line per harness-loop cycle end.
// Inactive (exits cleanly with no output) unless HARNESS_LOOP_CYCLE_ID is set.
// s1 §2.3: append-only JSONL, mtime-window transcript aggregation (C16).

import { existsSync, mkdirSync, readFileSync, readdirSync, appendFileSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createReadStream } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadHarnessConfig } from './_config.mjs';

const CYCLE_ID = process.env.HARNESS_LOOP_CYCLE_ID;
const ISSUE_NUMBER = Number(process.env.HARNESS_LOOP_ISSUE_NUMBER ?? 0) || null;
const CYCLE_START_MS = Number(process.env.HARNESS_LOOP_CYCLE_START_MS ?? 0) || null;

// No active cycle — exit cleanly.
if (!CYCLE_ID) process.exit(0);

const config = loadHarnessConfig();
if (!config) {
  warn('harness-loop.config.json not found or invalid — cost ledger skipped');
  process.exit(0);
}

const pricing = config.model_pricing ?? {};

// Locate transcript JSONL files for this project (mtime-window aggregation, C16).
function projectTranscriptDir() {
  const cwd = process.cwd();
  const encoded = '-' + cwd.replace(/^[/\\]+/, '').replace(/[/\\:]/g, '-');
  return join(homedir(), '.claude', 'projects', encoded);
}

async function parseUsageFromFile(filePath, startMs) {
  const stat = statSync(filePath, { throwIfNoEntry: false });
  // Bail if file disappeared between readdir and stat, or is older than the cycle window.
  if (!stat) return [];
  if (startMs && stat.mtimeMs < startMs) return [];
  if (stat.size === 0) return [];

  const usage = [];
  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let raw;
    try { raw = JSON.parse(trimmed); } catch { continue; }
    if (!raw || typeof raw !== 'object') continue;
    if (raw.type !== 'assistant') continue;
    const u = raw.message?.usage;
    const model = raw.message?.model;
    if (!u || !model) continue;
    usage.push({
      model,
      input_tokens: u.input_tokens ?? 0,
      output_tokens: u.output_tokens ?? 0,
      cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
      cache_creation_5m_input_tokens: u.cache_creation_5m_input_tokens ?? 0,
      cache_creation_1h_input_tokens: u.cache_creation_1h_input_tokens ?? 0,
    });
  }
  return usage;
}

function computeModelCost(model, tokens) {
  const p = pricing[model];
  if (!p) return null;
  const M = 1_000_000;
  return (
    (tokens.input_tokens * p.input_per_mtok) / M +
    (tokens.output_tokens * p.output_per_mtok) / M +
    (tokens.cache_read_input_tokens * p.cache_read_per_mtok) / M +
    (tokens.cache_creation_5m_input_tokens * p.cache_write_5m_per_mtok) / M +
    (tokens.cache_creation_1h_input_tokens * p.cache_write_1h_per_mtok) / M
  );
}

function warn(msg) {
  process.stderr.write(`[cost_ledger] WARN: ${msg}\n`);
}

async function run() {
  const transcriptDir = projectTranscriptDir();
  const allUsage = [];
  const unknownModels = [];

  if (existsSync(transcriptDir)) {
    const files = readdirSync(transcriptDir)
      .filter((n) => n.endsWith('.jsonl'))
      .map((n) => join(transcriptDir, n));

    // Parse files in parallel — JSONL I/O dominates and is independent per file.
    const results = await Promise.allSettled(
      files.map((f) => parseUsageFromFile(f, CYCLE_START_MS)),
    );
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled') {
        for (const entry of r.value) allUsage.push(entry);
      } else {
        warn(`failed to parse ${files[i]}: ${r.reason?.message ?? r.reason}`);
      }
    }
  }

  let usd_estimate = 0;
  const model_breakdown = {};
  for (const entry of allUsage) {
    const cost = computeModelCost(entry.model, entry);
    if (cost === null) {
      if (!unknownModels.includes(entry.model)) unknownModels.push(entry.model);
      continue;
    }
    model_breakdown[entry.model] = (model_breakdown[entry.model] ?? 0) + cost;
    usd_estimate += cost;
  }

  if (unknownModels.length > 0) {
    warn(`unknown models skipped in cost estimate: ${unknownModels.join(', ')}`);
  }

  const cap = config.caps?.usd_per_cycle ?? Infinity;
  const exceeded_cap = usd_estimate > cap;

  const record = {
    cycle_id: CYCLE_ID,
    issue_number: ISSUE_NUMBER,
    started_at: CYCLE_START_MS ? new Date(CYCLE_START_MS).toISOString() : null,
    ended_at: new Date().toISOString(),
    elapsed_ms: CYCLE_START_MS ? Date.now() - CYCLE_START_MS : null,
    model_breakdown,
    usd_estimate,
    exceeded_cap,
  };

  const ledgerDir = join(homedir(), '.claude', 'cache', 'harness-loop');
  const ledgerPath = join(ledgerDir, 'cost-ledger.jsonl');
  try {
    mkdirSync(ledgerDir, { recursive: true });
    appendFileSync(ledgerPath, JSON.stringify(record) + '\n', 'utf8');
  } catch (e) {
    warn(`failed to append cost ledger: ${e.message}`);
  }

  if (exceeded_cap) {
    process.stdout.write(JSON.stringify({
      decision: 'approve',
      reason: `[cost_ledger] Cycle ${CYCLE_ID} USD estimate $${usd_estimate.toFixed(4)} exceeded cap $${cap}. Set harness:cost-cap-hit label to pause loop.`,
    }));
  }
}

run().catch((e) => {
  warn(String(e));
  process.exit(0);
});
