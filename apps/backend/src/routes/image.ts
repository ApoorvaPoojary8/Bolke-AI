import sharp from 'sharp';  
import { callClaudeVision } from '../services/ai/claude.js';  
import { synthesise }       from '../services/tts/googleTts.js';  
import { uploadAudio }      from '../utils/storage.js';  
import { ImageReplySchema } from '../config/schema.js';  
import { requireAuth }      from '../middleware/auth.js';

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
    // This reduces token usage and speeds up Anthropic Vision  
    const optimised = await sharp(imageBuffer)  
      .resize({ width: 1024, withoutEnlargement: true })  
      .jpeg({ quality: 85 })  
      .toBuffer();

    const base64Image = optimised.toString('base64');

    // Call Claude Vision  
    let rawJson: string;  
    try {  
      rawJson = await callClaudeVision(base64Image, 'image/jpeg', targetLanguage);  
    } catch (err) {  
      console.error('Claude Vision failed:', err);  
      return reply.status(503).send({  
        error_code: 'VISION_FAILED',  
        user_message: 'Document nahi padh saka. Phir se try karein.',  
      });  
    }

    // Parse and validate response  
    const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();  
    let parsed: any;  
    try {  
      parsed = JSON.parse(cleaned);  
    } catch {  
      return reply.status(422).send({ error: 'Failed to parse document analysis' });  
    }

    const validated = ImageReplySchema.safeParse(parsed);  
    if (!validated.success) {  
      console.error('Image reply schema mismatch:', validated.error);  
      // Still return what we have — don't hard fail  
      parsed = { ...parsed, confidence: 0.5 };  
    }

    // TTS the overview sentence  
    const overviewAudio = await synthesise(parsed.overview, targetLanguage);  
    const audioFilename = `image-audio/${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`;  
    const overviewAudioUrl = await uploadAudio(overviewAudio, audioFilename, 'image-audio');

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
