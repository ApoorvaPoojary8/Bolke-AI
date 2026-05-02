/**
 * health.ts — Health Check Route
 *
 * Reports status of all AI providers in the new stack:
 * Groq (LLM + STT fallback), Deepgram (STT), Cartesia (TTS)
 */

import Groq from 'groq-sdk';

export default async function healthRoutes(app: any) {
  app.get('/health', async (_req: any, reply: any) => {
    // Ping Groq (primary LLM + STT fallback)
    let groqStatus = 'ok';
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });
      await groq.chat.completions.create({
        model:       'llama-3.1-8b-instant',
        messages:    [{ role: 'user', content: 'ping' }],
        max_tokens:  5,
      });
    } catch { groqStatus = 'degraded'; }

    return reply.send({
      status:   'ok',
      groq:     groqStatus,
      deepgram: process.env.DEEPGRAM_API_KEY ? 'configured' : 'no-key',
      cartesia: process.env.CARTESIA_API_KEY  ? 'configured' : 'no-key (browser TTS)',
      livekit:  process.env.LIVEKIT_URL       ? 'configured' : 'disabled (MediaRecorder)',
      stt:      process.env.DEEPGRAM_API_KEY  ? 'deepgram'   : 'groq-whisper',
      tts:      process.env.CARTESIA_API_KEY  ? 'cartesia'   : 'browser',
    });
  });
}
