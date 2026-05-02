import Anthropic from '@anthropic-ai/sdk';  
import { env }                      from '../../config/env.js';  
import { DIALECT_NORMALIZER_PROMPT } from '../../config/prompts.js';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// Cache the system prompt — same prompt every call so it caches after first use  
// Cost: ~0.000001 USD per call with prompt caching (effectively free)  
export async function normalizeDialect(rawTranscript: string): Promise<string> {  
  // Very short input — nothing to normalize, skip the extra call  
  if (rawTranscript.trim().split(' ').length <= 3) return rawTranscript;

  try {  
    const response = await anthropic.messages.create({  
      model: env.CLAUDE_PRIMARY_MODEL,   // claude-haiku-4-5-20251001  
      max_tokens: 150,                   // normalizer output is always short  
      system: [  
        {  
          type: 'text',  
          text: DIALECT_NORMALIZER_PROMPT,  
          cache_control: { type: 'ephemeral' }, // cache this — called every query  
        } as any,  
      ],  
      messages: [{ role: 'user', content: rawTranscript }],  
    });

    const normalized = response.content[0]?.type === 'text'  
      ? response.content[0].text.trim()  
      : rawTranscript;

    // Safety check: if output is empty or much shorter than input, use original  
    if (!normalized || normalized.length < rawTranscript.length * 0.3) {  
      return rawTranscript;  
    }

    console.log(`Dialect normalize: "${rawTranscript}" → "${normalized}"`);  
    return normalized;

  } catch (err) {  
    // Normalizer failure is non-fatal — fall through to intent parser with raw text  
    console.warn('Dialect normalizer failed, using raw transcript:', err);  
    return rawTranscript;  
  }  
}
