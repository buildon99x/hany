// KPI calculator for session-efficiency-metrics.
// Definitions: docs/feat_session-efficiency-metrics_s1.md §1.3.
// All ratios are null when the denominator is 0; the caller decides whether
// to render as `0` or `N/A` per the row policy.

import fs from 'node:fs';
import path from 'node:path';

export const THRESHOLDS = Object.freeze({
  R: 0.10,
  R_compile: 0.10,
  R_reedit: 0.10,
  C: 3,
  P: 0.70,
  H: 0.80,
});

const MUTATING_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit']);
const PRIVACY_HOOKS = new Set(['privacy_guard']);
const BASH_HOOKS = new Set(['bash_guard']);
const FRICTION_DECISIONS = new Set(['ask', 'deny']);

export class KpiAggregate {
  constructor() {
    this.compileSig = new Map();
    this.compileTotal = 0;
    this.reeditKey = new Map();
    this.editTotal = 0;
    this.precompactCount = 0;
    this.privacyFriction = 0;
    this.bashFriction = 0;
  }

  ingest(ev) {
    if (ev.kind === 'tool_use' && MUTATING_TOOLS.has(ev.tool_name) && ev.target_path) {
      this.editTotal += 1;
      const key = ev.pos_hash ? `${ev.target_path}@${ev.pos_hash}` : ev.target_path;
      this.reeditKey.set(key, (this.reeditKey.get(key) ?? 0) + 1);
      return;
    }
    if (ev.kind === 'tool_result' && ev.is_error) {
      const sigPart = ev.error_code ?? ev.error_hash;
      if (sigPart) {
        this.compileTotal += 1;
        const sig = `${sigPart}|${ev.target_path ?? '?'}`;
        this.compileSig.set(sig, (this.compileSig.get(sig) ?? 0) + 1);
      }
      return;
    }
    if (ev.kind === 'precompact') {
      this.precompactCount += 1;
      return;
    }
    if (ev.kind === 'hook_decision' && FRICTION_DECISIONS.has(ev.decision)) {
      if (PRIVACY_HOOKS.has(ev.hook_name)) this.privacyFriction += 1;
      else if (BASH_HOOKS.has(ev.hook_name)) this.bashFriction += 1;
    }
  }

  merge(other) {
    for (const [k, v] of other.compileSig) {
      this.compileSig.set(k, (this.compileSig.get(k) ?? 0) + v);
    }
    this.compileTotal += other.compileTotal;
    for (const [k, v] of other.reeditKey) {
      this.reeditKey.set(k, (this.reeditKey.get(k) ?? 0) + v);
    }
    this.editTotal += other.editTotal;
    this.precompactCount += other.precompactCount;
    this.privacyFriction += other.privacyFriction;
    this.bashFriction += other.bashFriction;
  }
}

function ratio(num, den) {
  if (den === 0) return null;
  return num / den;
}

function repeatedNumerator(map) {
  let total = 0;
  for (const v of map.values()) {
    if (v >= 2) total += v;
  }
  return total;
}

export function summarizeAggregate(agg) {
  const compileNum = repeatedNumerator(agg.compileSig);
  const reeditNum = repeatedNumerator(agg.reeditKey);
  const R_num = compileNum + reeditNum;
  const R_den = agg.compileTotal + agg.editTotal;
  return {
    R: ratio(R_num, R_den),
    R_compile: ratio(compileNum, agg.compileTotal),
    R_reedit: ratio(reeditNum, agg.editTotal),
    C: agg.precompactCount,
    F_privacy: agg.privacyFriction,
    F_bash: agg.bashFriction,
    raw: {
      compileNum,
      compileTotal: agg.compileTotal,
      reeditNum,
      editTotal: agg.editTotal,
    },
  };
}

function existsSync(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export function computeDocsKpis(docsRoot) {
  let entries;
  try {
    entries = fs.readdirSync(docsRoot);
  } catch {
    return { P: null, H: null, taskCount: 0, mediumPlusCount: 0, raw: null };
  }

  const tasks = new Map();
  for (const name of entries) {
    const m = name.match(/^feat_(.+?)_s1\.md$/);
    if (!m) continue;
    const taskName = m[1];
    if (tasks.has(taskName)) continue;
    tasks.set(taskName, {
      hasS0: existsSync(path.join(docsRoot, `feat_${taskName}_s0.md`)),
      hasS1: true,
      hasS2: existsSync(path.join(docsRoot, `feat_${taskName}_s2.md`)),
      hasLedger: existsSync(path.join(docsRoot, `feat_${taskName}_harness_ledger.md`)),
      hasQualityNote: existsSync(path.join(docsRoot, 'harness', `FEATURE_QUALITY_NOTE_${taskName}.md`)),
      hasDataInventory: existsSync(path.join(docsRoot, 'harness', `DATA_INVENTORY_${taskName}.md`)),
      hasRetrospective: existsSync(path.join(docsRoot, `feat_${taskName}_harness_retrospective.md`)),
    });
  }

  let pNum = 0;
  let pDen = 0;
  let hNum = 0;
  let hDen = 0;
  let mediumPlus = 0;

  for (const t of tasks.values()) {
    pDen += 4;
    if (t.hasS0) pNum += 1;
    if (t.hasS1) pNum += 1;
    if (t.hasS2) pNum += 1;
    if (t.hasLedger) pNum += 1;

    if (t.hasLedger) {
      mediumPlus += 1;
      hDen += 3;
      if (t.hasQualityNote) hNum += 1;
      if (t.hasDataInventory) hNum += 1;
      if (t.hasRetrospective) hNum += 1;
    }
  }

  return {
    P: pDen === 0 ? null : pNum / pDen,
    H: hDen === 0 ? null : hNum / hDen,
    taskCount: tasks.size,
    mediumPlusCount: mediumPlus,
    raw: { pNum, pDen, hNum, hDen },
  };
}

export function deriveWarnings(summary, docs) {
  const warns = [];
  if (summary.R !== null && summary.R >= THRESHOLDS.R) warns.push('R');
  if (summary.R_compile !== null && summary.R_compile >= THRESHOLDS.R_compile) warns.push('R_c');
  if (summary.R_reedit !== null && summary.R_reedit >= THRESHOLDS.R_reedit) warns.push('R_e');
  if (summary.C >= THRESHOLDS.C) warns.push('C');
  if (docs.P !== null && docs.P < THRESHOLDS.P) warns.push('P');
  if (docs.H !== null && docs.H < THRESHOLDS.H) warns.push('H');
  return warns;
}

export function fmtRatio(v) {
  if (v === null || v === undefined) return 'NA';
  return v.toFixed(2);
}
