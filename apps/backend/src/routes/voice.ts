/**
 * voice.ts — Voice Route
 *
 * Pipeline:
 *  Audio (multipart) → Deepgram STT → Groq LLM → ElevenLabs TTS → Response
 *
 * TTS mode:
 *  - If ELEVENLABS_API_KEY is set: audio is generated server-side via
 *    ElevenLabs Multilingual v2 and uploaded to Supabase.
 *  - Falls back to Cartesia → browser speechSynthesis if ElevenLabs unavailable.
 */

import { transcribeAudio }  from '../services/stt/deepgramStt.js';
import { synthesise }       from '../services/tts/elevenLabsTts.js';
import { routeToAI }        from '../services/ai/router.js';
import { normalizeDialect } from '../services/ai/normalizer.js';
import { uploadAudio, logQuery } from '../utils/storage.js';
import { requireAuth }      from '../middleware/auth.js';
import crypto from 'crypto';

export default async function voiceRoutes(app: any) {
  app.post('/voice', {
    preHandler: [requireAuth],
  }, async (req: any, reply: any) => {
    const startTime = Date.now();

    // 1. Extract audio and language hint from multipart
    const parts = req.parts();
    let audioBuffer: Buffer | null = null;
    let langHint:    string | null = null;
    let mimeType = 'audio/webm';

    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'audio') {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        audioBuffer = Buffer.concat(chunks);
        if (part.mimetype) mimeType = part.mimetype.split(';')[0].trim();
      }
      if (part.type === 'field' && part.fieldname === 'client_lang_hint') {
        langHint = part.value as string;
      }
    }

    if (!audioBuffer || audioBuffer.length < 100) {
      return reply.status(400).send({
        error_code:   'AUDIO_TOO_SHORT',
        user_message: 'Awaaz nahi aayi. Dobara bolen.',
      });
    }

    // 2. STT — Deepgram Nova-3
    let rawTranscript: string;
    let language: string;
    try {
      ({ transcript: rawTranscript, language } = await transcribeAudio(
        audioBuffer,
        langHint ?? undefined,
        mimeType,
      ));
    } catch (err) {
      console.error('[STT] Deepgram failed:', err);
      return reply.status(422).send({
        error_code:   'STT_FAILED',
        user_message: 'Saaf nahi suna, dobara bolen.',
      });
    }

    if (!rawTranscript) {
      return reply.status(422).send({
        error_code:   'STT_EMPTY',
        user_message: 'Kuch nahi suna. Dobara bolen.',
      });
    }

    // 2b. Dialect normalization — Hinglish/slang → clean standard text
    const transcript = await normalizeDialect(rawTranscript);

    // 3. AI intent parsing — Groq primary
    const aiReply = await routeToAI(transcript, langHint || language);

    // 4. TTS — ElevenLabs Multilingual v2 (falls back to Cartesia → browser TTS)
    const audioOut = await synthesise(aiReply.reply, aiReply.language);

    // 5. Upload MP3 if TTS generated audio
    let replyAudioUrl: string | null = null;
    if (audioOut !== null) {
      const filename = `tts/${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`;
      replyAudioUrl = await uploadAudio(audioOut, filename);
    }

    // 6. Log query
    const latencyMs = Date.now() - startTime;
    await logQuery({
      deviceIdHash: crypto.createHash('sha256').update(req.deviceId).digest('hex'),
      intent:       aiReply.intent,
      language:     aiReply.language,
      latencyMs,
    });

    const action = aiReply.action_url
      ? { type: 'call', label: 'Helpline call karein', url: aiReply.action_url }
      : null;

    return reply.send({
      request_id:      `req_${Date.now()}`,
      transcript:      rawTranscript,
      normalized:      transcript,
      language:        aiReply.language,
      reply_text:      aiReply.reply,
      reply_audio_url: replyAudioUrl,
      tts_mode:        replyAudioUrl ? 'elevenlabs' : 'browser',
      intent:          aiReply.intent,
      icon:            aiReply.icon,
      action,
      latency_ms:      latencyMs,
    });
  });
}
