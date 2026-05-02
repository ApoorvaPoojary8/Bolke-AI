/**
 * elevenLabsTts.ts — High-quality TTS via ElevenLabs Multilingual v2
 *
 * Replaces Cartesia Sonic as the primary TTS provider.
 *
 * Features:
 *  - ElevenLabs Multilingual v2 — supports Hindi, Kannada, Tamil,
 *    Telugu, Bengali, Marathi, English out of the box.
 *  - Returns MP3 Buffer for Supabase upload or direct streaming.
 *  - Graceful fallback to Cartesia → browser speechSynthesis.
 *
 * Voice IDs (ElevenLabs built-in multilingual voices):
 *  - Rachel (EXAVITQu4vr4xnSDxMaL) — warm female, great for Indian languages
 *  - Adam (pNInz6obpgDQGcFmaJgB)   — warm male, clear diction
 *
 * Docs: https://elevenlabs.io/docs/api-reference/text-to-speech
 */

import { synthesise as cartesiaSynthesise } from './cartesiaTts.js';

// ── Voice Configuration ──────────────────────────────────────────────────────
// ElevenLabs voice IDs — using multilingual-capable voices
const VOICE_FEMALE = 'EXAVITQu4vr4xnSDxMaL'; // Rachel — warm, natural
const VOICE_MALE   = 'pNInz6obpgDQGcFmaJgB'; // Adam   — clear, friendly

// Default voice per language (can be overridden)
function getVoiceId(language: string): string {
  // Use Rachel (female) for all languages — warm and clear
  // This can be expanded to use different voices per language
  return VOICE_FEMALE;
}

// ── BCP-47 Language Tags ─────────────────────────────────────────────────────
// ElevenLabs auto-detects language from text, but we pass a hint
export const TTS_LANG_MAP: Record<string, string> = {
  hi: 'hi-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  en: 'en-IN',
};

/**
 * Synthesise speech using ElevenLabs Multilingual v2.
 * Returns a Buffer of MP3 audio bytes.
 *
 * Fallback chain: ElevenLabs → Cartesia → null (browser TTS)
 */
export async function synthesise(
  text: string,
  language: string,
): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.warn('[TTS] ELEVENLABS_API_KEY not set — falling back to Cartesia');
    return cartesiaSynthesise(text, language);
  }

  const voiceId = getVoiceId(language);

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key':   apiKey,
          'Content-Type': 'application/json',
          Accept:         'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability:        0.5,   // balanced — not too robotic, not too variable
            similarity_boost: 0.75,  // stay close to the original voice
            style:            0.3,   // subtle expressiveness
            use_speaker_boost: true, // clarity enhancement
          },
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      console.error(`[TTS] ElevenLabs failed (${response.status}): ${err}`);
      // Fallback to Cartesia
      console.warn('[TTS] Falling back to Cartesia...');
      return cartesiaSynthesise(text, language);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 100) {
      console.warn('[TTS] ElevenLabs returned suspiciously small audio, falling back');
      return cartesiaSynthesise(text, language);
    }

    console.log(`[TTS] ElevenLabs OK — ${buffer.length} bytes, voice=${voiceId}`);
    return buffer;

  } catch (err: any) {
    console.error('[TTS] ElevenLabs error:', err.message);
    console.warn('[TTS] Falling back to Cartesia...');
    return cartesiaSynthesise(text, language);
  }
}
