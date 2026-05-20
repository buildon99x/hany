// JSONL → NormalizedEvent[] adapter, body content discarded at this boundary.
// Schema isolation: RawTranscriptEvent shapes are confined here per
// docs/feat_session-efficiency-metrics_s1.md §1.5.
// Body fragments (old_string / content / error message) are converted to
// fixed-length hashes here so the scrubber output never carries them.

import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import { sanitizeEvent, hashErrorMessage, positionHash } from './scrubber.mjs';

const ERROR_CODE_PATTERN = /\b(TS\d{3,5}|E\d{3,5}|EACCES|EPERM|ENOENT|EEXIST|ENOTDIR|EADDRINUSE)\b/;

function parseTimestamp(t) {
  if (typeof t === 'number' && Number.isFinite(t)) return t;
  if (typeof t === 'string') {
    const ms = Date.parse(t);
    if (Number.isFinite(ms)) return ms;
  }
  return undefined;
}

function flattenContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const parts = [];
    for (const x of content) {
      if (x && typeof x.text === 'string') parts.push(x.text);
    }
    return parts.join('\n');
  }
  return '';
}

export function adaptLine(line, ctx) {
  const trimmed = line.trim();
  if (trimmed.length === 0) return { events: [], skip: { reason: 'empty' } };

  let raw;
  try {
    raw = JSON.parse(trimmed);
  } catch {
    return { events: [], skip: { reason: 'parse' } };
  }
  if (!raw || typeof raw !== 'object') {
    return { events: [], skip: { reason: 'unknown', sample: 'non-object' } };
  }

  const sessionId = typeof raw.sessionId === 'string' && raw.sessionId.length > 0
    ? raw.sessionId
    : ctx.transcriptId;
  const session_id8 = sessionId.slice(0, 8);
  const transcript_id = ctx.transcriptId;
  const ts_ms = parseTimestamp(raw.timestamp);
  const type = raw.type;
  const candidates = [];

  if (type === 'system') {
    const sub = raw.subtype;
    if (sub === 'precompact') {
      candidates.push({ kind: 'precompact', ts_ms, session_id8, transcript_id });
    } else if (sub === 'hook_decision' || sub === 'hook') {
      candidates.push({
        kind: 'hook_decision',
        ts_ms,
        session_id8,
        transcript_id,
        hook_name: typeof raw.hook_name === 'string' ? raw.hook_name : undefined,
        decision: raw.decision,
      });
    } else {
      return { events: [], skip: { reason: 'unknown', sample: `system:${sub ?? '?'}` } };
    }
  } else if (type === 'user' && raw.message && Array.isArray(raw.message.content)) {
    let hasUserText = false;
    for (const block of raw.message.content) {
      if (block && block.type === 'text') hasUserText = true;
    }
    if (hasUserText && Number.isFinite(ts_ms)) ctx.lastUserTsMs = ts_ms;
    for (const block of raw.message.content) {
      if (!block || typeof block !== 'object') continue;
      if (block.type === 'text' && typeof block.text === 'string') {
        candidates.push({
          kind: 'user_turn',
          ts_ms,
          session_id8,
          transcript_id,
          bytes: Buffer.byteLength(block.text, 'utf8'),
        });
      } else if (block.type === 'tool_result') {
        const text = flattenContent(block.content);
        const c = {
          kind: 'tool_result',
          ts_ms,
          session_id8,
          transcript_id,
          is_error: block.is_error === true,
        };
        if (text.length > 0) {
          c.bytes = Buffer.byteLength(text, 'utf8');
          if (c.is_error) {
            const m = text.match(ERROR_CODE_PATTERN);
            if (m) c.error_code = m[1];
            const firstLine = text.split('\n', 1)[0];
            const hash = hashErrorMessage(firstLine);
            if (hash) c.error_hash = hash;
          }
        }
        candidates.push(c);
      }
    }
  } else if (type === 'assistant' && raw.message && Array.isArray(raw.message.content)) {
    const usage = raw.message.usage && typeof raw.message.usage === 'object' ? raw.message.usage : null;
    let usageAttached = false;
    const attachUsage = (c) => {
      if (usageAttached || !usage) return;
      const cc = usage.cache_creation && typeof usage.cache_creation === 'object' ? usage.cache_creation : null;
      if (Number.isFinite(usage.input_tokens)) c.usage_in = usage.input_tokens;
      if (Number.isFinite(usage.output_tokens)) c.usage_out = usage.output_tokens;
      if (cc && Number.isFinite(cc.ephemeral_1h_input_tokens)) c.usage_cc1h = cc.ephemeral_1h_input_tokens;
      if (cc && Number.isFinite(cc.ephemeral_5m_input_tokens)) c.usage_cc5m = cc.ephemeral_5m_input_tokens;
      if (Number.isFinite(usage.cache_read_input_tokens)) c.usage_cr = usage.cache_read_input_tokens;
      if (Number.isFinite(ctx.lastUserTsMs) && Number.isFinite(ts_ms)) {
        c.turn_interval_ms = Math.max(0, ts_ms - ctx.lastUserTsMs);
      }
      usageAttached = true;
    };
    for (const block of raw.message.content) {
      if (!block || typeof block !== 'object') continue;
      if (block.type === 'text' && typeof block.text === 'string') {
        const c = {
          kind: 'assistant_turn',
          ts_ms,
          session_id8,
          transcript_id,
          bytes: Buffer.byteLength(block.text, 'utf8'),
        };
        attachUsage(c);
        candidates.push(c);
      } else if (block.type === 'tool_use') {
        const c = {
          kind: 'tool_use',
          ts_ms,
          session_id8,
          transcript_id,
          tool_name: typeof block.name === 'string' ? block.name : undefined,
        };
        attachUsage(c);
        const input = block.input && typeof block.input === 'object' ? block.input : null;
        if (input) {
          if (typeof input.file_path === 'string') c.target_path = input.file_path;
          const fragment = typeof input.old_string === 'string'
            ? input.old_string
            : typeof input.content === 'string'
              ? input.content
              : '';
          if (fragment.length > 0) {
            const ph = positionHash(fragment);
            if (ph) c.pos_hash = ph;
          }
        }
        candidates.push(c);
      }
    }
  } else {
    return { events: [], skip: { reason: 'unknown', sample: `type:${type ?? '?'}` } };
  }

  const events = [];
  for (const c of candidates) {
    const sanitized = sanitizeEvent(c);
    if (sanitized) events.push(sanitized);
  }
  return { events, skip: null };
}

export async function adaptFile(filePath, onEvent) {
  const transcriptId = path.basename(filePath, path.extname(filePath));
  const ctx = { transcriptId, lastUserTsMs: undefined };

  let lines = 0;
  const skipped = { parse: 0, unknown: 0, empty: 0, firstSample: null };

  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    lines += 1;
    const { events, skip } = adaptLine(line, ctx);
    if (skip) {
      if (skip.reason === 'parse') {
        skipped.parse += 1;
      } else if (skip.reason === 'unknown') {
        skipped.unknown += 1;
        if (!skipped.firstSample) skipped.firstSample = skip.sample ?? 'unknown';
      } else if (skip.reason === 'empty') {
        skipped.empty += 1;
      }
    }
    for (const ev of events) onEvent(ev);
  }

  return { lines, skipped, transcriptId };
}
