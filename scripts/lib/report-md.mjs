// Append-only Markdown report writer for session-efficiency-metrics.
// EOL=LF enforced via raw '\n' (no os.EOL). The companion .gitattributes
// entry guards against autocrlf on Windows.

import fs from 'node:fs';
import path from 'node:path';
import { fmtRatio } from './kpi.mjs';

const HEADER = '# Session Efficiency Metrics\n\n> Append-only run log. Each invocation adds a new `## Run …` section; never overwrites.\n\n';

export function buildRunSection({
  timestampIso,
  sessionLabel,
  branch,
  inputPath,
  summary,
  docs,
  warnings,
  noise,
  recommendations,
}) {
  const lines = [];
  lines.push(`## Run ${timestampIso}`);
  lines.push('');
  lines.push(`- Session: \`${sessionLabel}\``);
  lines.push(`- Branch: \`${branch}\``);
  lines.push(`- Input: \`${inputPath}\``);
  lines.push('');
  lines.push('| KPI | Value | Threshold |');
  lines.push('|---|---|---|');
  lines.push(`| R (combined) | ${fmtRatio(summary.R)} | >=0.10 warn |`);
  lines.push(`| R_compile | ${fmtRatio(summary.R_compile)} | >=0.10 warn |`);
  lines.push(`| R_reedit | ${fmtRatio(summary.R_reedit)} | >=0.10 warn |`);
  lines.push(`| C (PreCompact) | ${summary.C} | >=3 warn |`);
  lines.push(`| F_privacy | ${summary.F_privacy} | label later |`);
  lines.push(`| F_bash | ${summary.F_bash} | label later |`);
  lines.push(`| P (process) | ${fmtRatio(docs.P)} | >=0.70 ok |`);
  lines.push(`| H (handoff) | ${fmtRatio(docs.H)} | >=0.80 ok |`);
  lines.push('');
  lines.push('### Warnings');
  if (warnings.length === 0) {
    lines.push('- none');
  } else {
    for (const w of warnings) lines.push(`- warn: ${w}`);
  }
  lines.push('');
  lines.push('### Noise');
  lines.push(`- parse failures: ${noise.parse}`);
  const sample = noise.firstSample ? ` (first: \`${noise.firstSample}\`)` : '';
  lines.push(`- unknown fields: ${noise.unknown}${sample}`);
  lines.push(`- empty lines: ${noise.empty}`);
  lines.push('');
  lines.push('### Recommendations');
  if (recommendations.length === 0) {
    lines.push('- (none)');
  } else {
    for (const r of recommendations) lines.push(`- ${r}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function appendReport(reportPath, section) {
  const dir = path.dirname(reportPath);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(reportPath)) {
    fs.writeFileSync(reportPath, HEADER, { encoding: 'utf8' });
  }
  fs.appendFileSync(reportPath, section, { encoding: 'utf8' });
}

export function defaultReportPath(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return path.join('docs', 'harness', `session_metrics_${y}-${m}-${d}.md`);
}
