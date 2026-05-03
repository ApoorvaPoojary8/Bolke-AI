/**
 * image.ts — Image / Document Analysis Route
 *
 * Pipeline: Image upload → Groq Vision (llama-3.2-11b-vision-preview) → Cartesia TTS
 *
 * Replaces Claude Vision + Google TTS with Groq Vision + Cartesia.
 */

import sharp   from 'sharp';
import Groq    from 'groq-sdk';
import { synthesise }     from '../services/tts/cartesiaTts.js';
import { uploadAudio }    from '../utils/storage.js';
import { ImageReplySchema } from '../config/schema.js';
import { requireAuth }    from '../middleware/auth.js';
import { env }            from '../config/env.js';

const VISION_SYSTEM_PROMPT = `You are BolKe, a document reader for low-literacy users in rural India.
Given an image of a government document, extract text, identify document type,
translate key information to the target language, and write ONE plain spoken overview sentence.

Output STRICT JSON only:
{
  "document_type": "ration_card | hospital_record | pension_letter | bank_statement | id_card | other",
  "extracted_text": "all text found in image verbatim",
  "translated_text": "complete translation in target language",
  "overview": "ONE plain sentence in target language for non-literate listener",
  "language": "ISO code of target language",
  "confidence": 0.0
}`;

let groqClient: Groq | null = null;
function getGroq(): Groq {
  if (!groqClient) groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
  return groqClient;
}

async function analyzeImageWithGroq(
  imageBase64: string,
  mimeType: string,
  targetLanguage: string,
): Promise<string> {
  const prompt = `Target language ISO code: ${targetLanguage}. Analyse this document image and respond in the exact JSON format from your system prompt.`;

  const completion = await getGroq().chat.completions.create({
    model:       'meta-llama/llama-3.2-11b-vision-preview',   // Groq multimodal vision
    max_tokens:  1024,
    messages: [
      { role: 'system', content: VISION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
          { type: 'text', text: prompt },
        ] as any,
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? '';
}

export default async function imageRoutes(app: any) {
  app.post('/image', {
    preHandler: [requireAuth],
  }, async (req: any, reply: any) => {
    const parts = req.parts();
    let imageBuffer: Buffer | null = null;
    let mimeType = 'image/jpeg';
    let targetLanguage = 'hi';

    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'image') {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        imageBuffer = Buffer.concat(chunks);
        mimeType = part.mimetype;
      }
      if (part.type === 'field' && part.fieldname === 'target_language') {
        targetLanguage = part.value as string;
      }
    }

    if (!imageBuffer) {
      return reply.status(400).send({ error: 'No image provided' });
    }

    // Optimise image: resize to max 1024px wide, convert to JPEG
    const optimised = await sharp(imageBuffer)
      .resize({ width: 1024, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const base64Image = optimised.toString('base64');

    // Call Groq Vision
    let rawJson: string;
    try {
      rawJson = await analyzeImageWithGroq(base64Image, 'image/jpeg', targetLanguage);
    } catch (err) {
      console.error('[Vision] Groq Vision failed:', err);
      return reply.status(503).send({
        error_code:   'VISION_FAILED',
        user_message: 'Document nahi padh saka. Phir se try karein.',
      });
    }

    // Parse and validate response
    const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let parsed: any;
    try {
      const match = cleaned.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : cleaned);
    } catch {
      return reply.status(422).send({ error: 'Failed to parse document analysis' });
    }

    const validated = ImageReplySchema.safeParse(parsed);
    if (!validated.success) {
      console.error('Image reply schema mismatch:', validated.error);
      parsed = { ...parsed, confidence: 0.5 };
    }

    // TTS the overview sentence using Cartesia
    const overviewAudio = await synthesise(parsed.overview, targetLanguage);
    let overviewAudioUrl: string | null = null;
    if (overviewAudio) {
      const audioFilename = `image-audio/${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`;
      overviewAudioUrl = await uploadAudio(overviewAudio, audioFilename, 'image-audio');
    }

    return reply.send({
      document_type:      parsed.document_type ?? 'other',
      extracted_text:     parsed.extracted_text ?? '',
      translated_text:    parsed.translated_text ?? '',
      overview_text:      parsed.overview ?? '',
      overview_audio_url: overviewAudioUrl,
      language:           parsed.language ?? targetLanguage,
      confidence:         parsed.confidence ?? 0.5,
    });
  });
}
