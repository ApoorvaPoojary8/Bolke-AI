/**
 * health.ts — Health Check Route
 *
 * Reports status of all AI providers in the stack:
 * Groq (LLM + STT fallback), Deepgram (STT), ElevenLabs (TTS primary), Cartesia (TTS fallback)
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

    // Determine TTS provider chain
    const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
    const hasCartesia   = !!process.env.CARTESIA_API_KEY;
    let ttsStatus = 'browser';
    if (hasElevenLabs) ttsStatus = 'elevenlabs';
    else if (hasCartesia) ttsStatus = 'cartesia';

    return reply.send({
      status:      'ok',
      groq:        groqStatus,
      deepgram:    process.env.DEEPGRAM_API_KEY    ? 'configured' : 'no-key',
      elevenlabs:  hasElevenLabs                   ? 'configured' : 'no-key',
      cartesia:    hasCartesia                     ? 'configured (fallback)' : 'no-key',
      livekit:     process.env.LIVEKIT_URL         ? 'configured' : 'disabled (MediaRecorder)',
      stt:         process.env.DEEPGRAM_API_KEY    ? 'deepgram'   : 'groq-whisper',
      tts:         ttsStatus,
    });
  });
}

