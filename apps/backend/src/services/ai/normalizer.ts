/**
 * normalizer.ts — Dialect Normalizer
 *
 * Converts Hinglish/slang/informal input → clean standard text
 * before sending to the intent parser.
 *
 * MIGRATED: Claude → Groq Llama 3.1 8B (fast, cheap, no Anthropic key needed)
 */

import Groq from 'groq-sdk';
import { env } from '../../config/env.js';
import { DIALECT_NORMALIZER_PROMPT } from '../../config/prompts.js';

let groqClient: Groq | null = null;

function getGroq(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
  }
  return groqClient;
}

export async function normalizeDialect(rawTranscript: string): Promise<string> {
  // Very short input — nothing to normalize
  if (rawTranscript.trim().split(' ').length <= 3) return rawTranscript;

  try {
    const completion = await getGroq().chat.completions.create({
      model:       'llama-3.1-8b-instant',  // fast + cheap for normalization
      messages: [
        { role: 'system', content: DIALECT_NORMALIZER_PROMPT },
        { role: 'user',   content: rawTranscript },
      ],
      max_tokens:  150,
      temperature: 0.1,
    });

    const normalized = completion.choices[0]?.message?.content?.trim() ?? rawTranscript;

    // Safety: if output is empty or much shorter than input, use original
    if (!normalized || normalized.length < rawTranscript.length * 0.3) {
      return rawTranscript;
    }

    console.log(`Dialect normalize: "${rawTranscript}" → "${normalized}"`);
    return normalized;

  } catch (err) {
    // Non-fatal — fall through to intent parser with raw text
    console.warn('[Normalizer] Groq failed, using raw transcript:', err);
    return rawTranscript;
  }
}
