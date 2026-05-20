// Privacy boundary for session-efficiency-metrics analyzer.
// Strips candidate normalized events to the meta-only allowlist defined in
// docs/feat_session-efficiency-metrics_s1.md §1.5 / §1.10.
// No prompt body, no tool_input body, no file content, no bash command body,
// no window titles, no coordinates may pass.

import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';

export const SENTINEL_PATTERNS = Object.freeze([
  '__SECRET_PROMPT__',
  '__SECRET_CMD__',
  '__SECRET_FILE__',
  '__SECRET_TITLE__',
]);

const ALLOWED_KINDS = new Set([
  'tool_use',
  'tool_result',
  'hook_decision',
  'user_turn',
  'assistant_turn',
  'precompact',
]);

const ALLOWED_DECISIONS = new Set(['allow', 'ask', 'deny']);

const MAX_NAME = 64;
const MAX_ID = 64;
const MAX_CODE = 64;
const MAX_SESSION_ID = 16;

export function hashErrorMessage(msg) {
  if (typeof msg !== 'string' || msg.length === 0) return undefined;
  return crypto.createHash('sha256').update(msg, 'utf8').digest('hex').slice(0, 12);
}

// 8-hex position proxy for R_reedit keying. Hashes a short content fragment
// so the original body never leaves the adapter; see Scope Discovery #1 in
// docs/feat_session-efficiency-metrics_harness_ledger.md.
export function positionHash(fragment) {
  if (typeof fragment !== 'string' || fragment.length === 0) return undefined;
  const head = fragment.slice(0, 64);
  return crypto.createHash('sha256').update(head, 'utf8').digest('hex').slice(0, 8);
}

export function pathBasename(p) {
  if (typeof p !== 'string' || p.length === 0) return undefined;
  const s = p.replace(/\\/g, '/');
  return path.posix.basename(s);
}

export function pathDepth(p) {
  if (typeof p !== 'string' || p.length === 0) return undefined;
  const home = os.homedir();
  let s = p;
  if (home && s.startsWith(home)) s = s.slice(home.length);
  s = s.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = s.split('/').filter(Boolean);
  return Math.max(0, parts.length - 1);
}

export function sanitizeEvent(c) {
  if (!c || typeof c !== 'object') return null;
  if (!ALLOWED_KINDS.has(c.kind)) return null;

  const out = { kind: c.kind };

  if (typeof c.ts_ms === 'number' && Number.isFinite(c.ts_ms) && c.ts_ms >= 0) {
    out.ts_ms = Math.floor(c.ts_ms);
  }
  if (typeof c.tool_name === 'string' && c.tool_name.length > 0 && c.tool_name.length <= MAX_NAME) {
    out.tool_name = c.tool_name;
  }
  if (typeof c.hook_name === 'string' && c.hook_name.length > 0 && c.hook_name.length <= MAX_NAME) {
    out.hook_name = c.hook_name;
  }
  if (ALLOWED_DECISIONS.has(c.decision)) {
    out.decision = c.decision;
  }
  if (typeof c.target_path === 'string' && c.target_path.length > 0) {
    const base = pathBasename(c.target_path);
    if (base) out.target_path = base;
    const depth = pathDepth(c.target_path);
    if (typeof depth === 'number') out.target_depth = depth;
  }
  if (typeof c.error_code === 'string' && c.error_code.length > 0 && c.error_code.length <= MAX_CODE) {
    out.error_code = c.error_code;
  }
  if (typeof c.error_hash === 'string' && /^[0-9a-f]{12}$/.test(c.error_hash)) {
    out.error_hash = c.error_hash;
  }
  if (typeof c.pos_hash === 'string' && /^[0-9a-f]{8}$/.test(c.pos_hash)) {
    out.pos_hash = c.pos_hash;
  }
  if (typeof c.bytes === 'number' && Number.isFinite(c.bytes) && c.bytes >= 0) {
    out.bytes = Math.floor(c.bytes);
  }
  if (typeof c.is_error === 'boolean') {
    out.is_error = c.is_error;
  }
  if (typeof c.session_id8 === 'string' && c.session_id8.length > 0 && c.session_id8.length <= MAX_SESSION_ID) {
    out.session_id8 = c.session_id8;
  }
  if (typeof c.transcript_id === 'string' && c.transcript_id.length > 0 && c.transcript_id.length <= MAX_ID) {
    out.transcript_id = c.transcript_id;
  }
  for (const key of ['usage_in', 'usage_out', 'usage_cc1h', 'usage_cc5m', 'usage_cr', 'turn_interval_ms']) {
    const v = c[key];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
      out[key] = Math.floor(v);
    }
  }

  return out;
}

export function assertNoSentinels(value, label = 'output') {
  const s = JSON.stringify(value);
  for (const pat of SENTINEL_PATTERNS) {
    if (s.includes(pat)) {
      throw new Error(`scrubber leak: sentinel ${pat} appeared in ${label}`);
    }
  }
  // Also assert no obvious coordinate-shaped numbers from leak fixture
  // (123456 / 789012 are the leak fixture sentinels).
  if (s.includes('123456') || s.includes('789012')) {
    throw new Error(`scrubber leak: coordinate sentinel in ${label}`);
  }
}
