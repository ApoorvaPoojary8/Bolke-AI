/**
 * groq.ts — Groq Llama: PRIMARY AI provider for BolKe
 *
 * Groq is now the PRIMARY LLM (replaces Claude as primary).
 * Model: llama-3.3-70b-versatile (best multilingual + JSON mode)
 *
 * Why Groq as primary:
 *  - Ultra-low latency (<200ms on Groq LPU)
 *  - Generous free tier (14,400 req/day)
 *  - Excellent Indian language support via Llama 3.3
 *  - No billing required to get started
 *
 * Docs: https://console.groq.com/docs/openai
 */

import Groq from 'groq-sdk';
import { env } from '../../config/env.js';
import { BOLKE_SYSTEM_PROMPT } from '../../config/prompts.js';
import { ClaudeReplySchema, type ClaudeReply } from '../../config/schema.js';

let groqClient: Groq | null = null;

function getGroq(): Groq {
  if (!groqClient) {
    if (!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
    groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
  }
  return groqClient;
}

function tryParseReply(raw: string): ClaudeReply | null {
  try {
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    // Extract first {...} block in case of extra text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const result = ClaudeReplySchema.safeParse(JSON.parse(match[0]));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * callGroq — Primary intent parser using Groq Llama 3.3 70B.
 * Uses JSON mode for strict structured output.
 */
export async function callGroq(transcript: string, language?: string): Promise<ClaudeReply> {
  const systemPrompt = language
    ? `${BOLKE_SYSTEM_PROMPT}\n\nIMPORTANT: The user's preferred language code is '${language}'. You MUST reply in this language.`
    : BOLKE_SYSTEM_PROMPT;

  const completion = await getGroq().chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: transcript },
    ],
    max_tokens:  300,
    temperature: 0.1,
    // Groq supports response_format for JSON mode
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content ?? '';
  const parsed = tryParseReply(raw);
  if (!parsed) throw new Error('Groq: invalid JSON response');
  return parsed;
}

/**
 * callGroqFallback — Kept for backward compat (no JSON mode = more lenient)
 */
export async function callGroqFallback(transcript: string, language?: string): Promise<string> {
  const systemPrompt = language
    ? `${BOLKE_SYSTEM_PROMPT}\n\nIMPORTANT: The user's preferred language code is '${language}'. You MUST reply in this language.`
    : BOLKE_SYSTEM_PROMPT;

  const completion = await getGroq().chat.completions.create({
    model:       'llama-3.1-8b-instant',  // smaller, faster fallback
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: transcript },
    ],
    max_tokens:  300,
    temperature: 0.1,
  });
  return completion.choices[0]?.message?.content ?? '';
}
