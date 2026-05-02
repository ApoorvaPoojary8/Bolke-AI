import { callClaude }                       from './claude.js';  
import { callGroqFallback }               from './groq.js';  
import { callPollinationsFallback }       from './pollinations.js';  
import { ClaudeReplySchema, type ClaudeReply } from '../../config/schema.js';

const SAFE_FALLBACK: ClaudeReply = {  
  reply: 'Maaf kijiye, abhi samajh nahi aaya. Dobara bolen.',  
  intent: 'unknown', icon: 'unknown',  
  language: 'hi', action_url: null, confidence: 0,  
};

function tryParseReply(raw: string): ClaudeReply | null {  
  try {  
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();  
    const result = ClaudeReplySchema.safeParse(JSON.parse(cleaned));  
    return result.success ? result.data : null;  
  } catch {  
    return null;  
  }  
}

export async function routeToAI(transcript: string): Promise<ClaudeReply> {  
  // 1. Claude (primary — always try first)  
  try {  
    return await callClaude(transcript);  
  } catch (err) {  
    console.error('Claude completely unavailable:', err);  
  }

  // 2. Groq (emergency fallback — only if Claude is down)  
  try {  
    console.warn('Falling back to Groq...');  
    const raw = await callGroqFallback(transcript);  
    const parsed = tryParseReply(raw);  
    if (parsed) return parsed;  
  } catch (err) {  
    console.error('Groq fallback failed:', err);  
  }

  // 3. Pollinations (last resort — no key needed)  
  try {  
    console.warn('Falling back to Pollinations...');  
    const raw = await callPollinationsFallback(transcript);  
    const parsed = tryParseReply(raw);  
    if (parsed) return parsed;  
  } catch (err) {  
    console.error('Pollinations fallback failed:', err);  
  }

  // 4. Static safe reply  
  console.error('All AI providers failed — returning static fallback');  
  return SAFE_FALLBACK;  
}
