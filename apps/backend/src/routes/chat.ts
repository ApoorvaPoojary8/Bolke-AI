import { routeToAI }        from '../services/ai/router.js';
import { normalizeDialect } from '../services/ai/normalizer.js';
import { synthesise }       from '../services/tts/elevenLabsTts.js';
import { uploadAudio }      from '../utils/storage.js';
import { requireAuth }      from '../middleware/auth.js';
import crypto from 'crypto';

export default async function chatRoutes(app: any) {
  // POST /v1/chat — text-based query (no STT needed)
  app.post('/chat', {
    preHandler: [requireAuth],
  }, async (req: any, reply: any) => {
    const startTime = Date.now();
    const { message, language } = req.body ?? {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return reply.status(400).send({
        error_code: 'EMPTY_MESSAGE',
        user_message: 'Kuch likhein pehle.',
      });
    }

    const langHint = language || 'hi';

    // 1. Dialect normalization
    const normalizedMessage = await normalizeDialect(message.trim());

    // 2. AI intent + reply (Claude primary, fallback chain)
    const aiReply = await routeToAI(normalizedMessage);

    // 3. TTS — generate audio for the reply
    let replyAudioUrl: string | null = null;
    try {
      const audioOut = await synthesise(aiReply.reply, aiReply.language);
      if (audioOut) {
        const filename = `tts/${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`;
        replyAudioUrl = await uploadAudio(audioOut, filename);
      }
    } catch (err) {
      console.warn('TTS failed for chat reply, continuing without audio:', err);
    }

    const latencyMs = Date.now() - startTime;

    const action = aiReply.action_url ? {
      type: 'call',
      label: 'Helpline call karein',
      url: aiReply.action_url,
    } : null;

    return reply.send({
      request_id:      `req_${Date.now()}`,
      original:        message.trim(),
      normalized:      normalizedMessage,
      language:        aiReply.language,
      reply_text:      aiReply.reply,
      reply_audio_url: replyAudioUrl,
      intent:          aiReply.intent,
      icon:            aiReply.icon,
      action,
      confidence:      aiReply.confidence,
      latency_ms:      latencyMs,
    });
  });
}
