/**
 * tts.ts — Dedicated TTS Route
 *
 * POST /v1/tts — Convert text to speech using ElevenLabs Multilingual v2
 *
 * Request:  { text: string, language?: string, voice?: "male"|"female" }
 * Response: Binary audio/mpeg stream
 *
 * Fallback chain: ElevenLabs → Cartesia → 503 error
 * (No browser fallback on server side — the client handles that)
 */

import { synthesise } from '../services/tts/elevenLabsTts.js';

export default async function ttsRoutes(app: any) {
  app.post('/tts', async (req: any, reply: any) => {
    const startTime = Date.now();
    const { text, language = 'hi' } = req.body ?? {};

    // ── Validation ──────────────────────────────────────────────────────────
    if (!text || typeof text !== 'string' || !text.trim()) {
      return reply.status(400).send({
        error_code:   'MISSING_TEXT',
        user_message: 'Text field is required and cannot be empty.',
      });
    }

    if (text.length > 5000) {
      return reply.status(400).send({
        error_code:   'TEXT_TOO_LONG',
        user_message: 'Text exceeds 5000 character limit.',
        max_length:   5000,
        received:     text.length,
      });
    }

    // ── Synthesise ──────────────────────────────────────────────────────────
    try {
      const audioBuffer = await synthesise(text.trim(), language);

      if (!audioBuffer || audioBuffer.length < 100) {
        return reply.status(503).send({
          error_code:   'TTS_UNAVAILABLE',
          user_message: 'Voice synthesis is temporarily unavailable.',
          fallback:     'browser',
        });
      }

      const latencyMs = Date.now() - startTime;

      return reply
        .header('Content-Type', 'audio/mpeg')
        .header('Content-Length', audioBuffer.length)
        .header('X-TTS-Provider', 'elevenlabs')
        .header('X-TTS-Latency-Ms', latencyMs.toString())
        .header('Cache-Control', 'no-cache')
        .send(audioBuffer);

    } catch (err: any) {
      console.error('[TTS Route] Synthesis failed:', err.message);
      return reply.status(500).send({
        error_code:   'TTS_ERROR',
        user_message: 'Voice generation failed.',
        detail:       err.message,
      });
    }
  });

  // GET /v1/tts/status — Quick check if TTS is available
  app.get('/tts/status', async (_req: any, reply: any) => {
    const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
    const hasCartesia   = !!process.env.CARTESIA_API_KEY;

    return reply.send({
      available:    hasElevenLabs || hasCartesia,
      primary:      hasElevenLabs ? 'elevenlabs' : (hasCartesia ? 'cartesia' : 'none'),
      fallback:     hasElevenLabs && hasCartesia ? 'cartesia' : 'browser',
      last_resort:  'browser',
    });
  });
}
