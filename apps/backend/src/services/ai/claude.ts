import Anthropic from '@anthropic-ai/sdk';  
import { env } from '../../config/env.js';  
import { BOLKE_SYSTEM_PROMPT } from '../../config/prompts.js';  
import { ClaudeReplySchema, type ClaudeReply } from '../../config/schema.js';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });


function parseClaudeResponse(raw: string): ClaudeReply | null {  
  try {  
    const cleaned = raw  
      .replace(/```json\n?/g, '')  
      .replace(/```\n?/g, '')  
      .trim();  
    const parsed = JSON.parse(cleaned);  
    const result = ClaudeReplySchema.safeParse(parsed);  
    return result.success ? result.data : null;  
  } catch {  
    return null;  
  }  
}

export async function callClaude(  
  transcript: string,  
  attempt = 0,  
): Promise<ClaudeReply> {  
  // attempt 0,1 = Haiku. attempt 2 = Sonnet escalation  
  const model = attempt < 2  
    ? env.CLAUDE_PRIMARY_MODEL  
    : env.CLAUDE_ESCALATION_MODEL;

  try {  
    const response = await anthropic.messages.create({  
      model,  
      max_tokens: 300, // HARD CAP — never increase  
      system: [  
        {  
          type: 'text',  
          text: BOLKE_SYSTEM_PROMPT,  
          cache_control: { type: 'ephemeral' }, // 90% cost saving  
        } as any,  
      ],  
      messages: [{ role: 'user', content: transcript }],  
    });

    const raw = response.content[0]?.type === 'text'  
      ? response.content[0].text  
      : '';

    const parsed = parseClaudeResponse(raw);  
    if (parsed) return parsed;

    // Retry chain: attempt 0 → 1 (Haiku retry) → 2 (Sonnet) → fallback  
    if (attempt < 2) {  
      console.warn(`Claude attempt ${attempt} returned invalid JSON, retrying...`);  
      return callClaude(transcript, attempt + 1);  
    }

    throw new Error('All Claude attempts returned invalid JSON');

  } catch (err: any) {  
    // Rate limit or 5xx — try escalation once  
    if (attempt < 2) {  
      console.warn(`Claude attempt ${attempt} errored (${err.status}), retrying...`);  
      return callClaude(transcript, attempt + 1);  
    }  
    throw new Error(`Claude failed after all retries: ${err.message}`);  
  }  
}

// Separate function for image/document analysis (uses vision via base64)  
export async function callClaudeVision(  
  imageBase64: string,  
  mimeType: string,  
  targetLanguage: string,  
): Promise<string> {  
  const prompt = `Target language ISO code: ${targetLanguage}. Analyse this document image and respond in the exact JSON format from your system prompt.`;

  const response = await anthropic.messages.create({  
    model: env.CLAUDE_PRIMARY_MODEL,  
    max_tokens: 1024,  
    messages: [  
      {  
        role: 'user',  
        content: [  
          {  
            type: 'image',  
            source: {  
              type: 'base64',  
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',  
              data: imageBase64,  
            },  
          },  
          { type: 'text', text: prompt },  
        ],  
      },  
    ],  
    system: `  
You are BolKe, a document reader for low-literacy users in rural India.  
Given an image of a government document, extract text, identify document type,  
translate key information to the target language, and write ONE plain spoken overview sentence.

Output STRICT JSON only:  
{  
  "document_type": "ration_card | hospital_record | pension_letter | bank_statement | id_card | other",  
  "extracted_text": "all text found in image verbatim",  
  "translated_text": "complete translation in target language",  
  "overview": "ONE plain sentence in target language for non-literate listener",  
  "language": "ISO code of target language",  
  "confidence": 0.0–1.0  
}`.trim(),  
  });

  return response.content[0]?.type === 'text' ? response.content[0].text : '';  
}
