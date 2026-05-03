/**
 * router.ts — AI Router
 *
 * New provider priority (Groq as primary, Claude removed):
 *  1. Groq Llama 3.3 70B    — primary (ultra-fast LPU, JSON mode, free tier)
 *  2. Groq Llama 3.1 8B     — fast fallback (smaller model, same infra)
 *  3. Pollinations           — last resort (no key needed, always available)
 *  4. Static safe fallback   — never fails
 */

import { callGroq, callGroqFallback }       from './groq.js';
import { callPollinationsFallback }          from './pollinations.js';
import { ClaudeReplySchema, type ClaudeReply } from '../../config/schema.js';

const SAFE_FALLBACK: ClaudeReply = {
  reply:      'Maaf kijiye, abhi samajh nahi aaya. Dobara bolen.',
  intent:     'unknown',
  icon:       'unknown',
  language:   'hi',
  action_url: null,
  confidence: 0,
};

function tryParseReply(raw: string): ClaudeReply | null {
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const result = ClaudeReplySchema.safeParse(JSON.parse(match[0]));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function routeToAI(transcript: string, language?: string): Promise<ClaudeReply> {
  // 1. Groq Llama 3.3 70B — PRIMARY
  try {
    return await callGroq(transcript, language);
  } catch (err) {
    console.warn('[AI] Groq 70B failed:', err);
  }

  // 2. Groq Llama 3.1 8B — FAST FALLBACK
  try {
    console.warn('[AI] Falling back to Groq 8B...');
    const raw    = await callGroqFallback(transcript, language);
    const parsed = tryParseReply(raw);
    if (parsed) return parsed;
  } catch (err) {
    console.error('[AI] Groq 8B fallback failed:', err);
  }

  // 3. Pollinations — LAST RESORT (no key needed)
  try {
    console.warn('[AI] Falling back to Pollinations...');
    const raw    = await callPollinationsFallback(transcript, language);
    const parsed = tryParseReply(raw);
    if (parsed) return parsed;
  } catch (err) {
    console.error('[AI] Pollinations fallback failed:', err);
  }

  // 4. Static safe reply — NEVER FAILS
  console.error('[AI] All providers failed — returning static fallback');
  return SAFE_FALLBACK;
}
