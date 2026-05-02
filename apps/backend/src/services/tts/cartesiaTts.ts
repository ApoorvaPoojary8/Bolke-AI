/**
 * cartesiaTts.ts — High-quality TTS via Cartesia Sonic
 *
 * Replaces both browser speechSynthesis (low quality, robotic)
 * and Google Cloud TTS (paid).
 *
 * Cartesia Sonic is ultra-low latency (~135ms TTFB) and produces
 * natural-sounding speech in Indian languages.
 *
 * Docs: https://docs.cartesia.ai/api-reference/tts/bytes
 * Model: sonic-2  (multilingual, latest stable)
 *
 * Voice IDs for Indian languages (Cartesia's built-in voices):
 *  - Hindi:    a0e99841-438c-4a64-b679-ae501e7d6091 (Vanya - F, warm)
 *  - Kannada:  use hi voice with language override (best available)
 *  - Tamil:    use hi voice with language override
 *  - Telugu:   use hi voice with language override
 *  - Bengali:  use hi voice with language override
 *  - Marathi:  use hi voice with language override
 *  - English:  694f9389-aac1-45b6-b726-9d9369183238 (Barbra - F, warm)
 */

// Cartesia BCP-47 language codes
const CARTESIA_LANG_MAP: Record<string, string> = {
  hi: 'hi',
  kn: 'kn',
  ta: 'ta',
  te: 'te',
  bn: 'bn',
  mr: 'mr',
  en: 'en',
};

// Voice IDs — use a warm Hindi voice for all Indian languages
// since Cartesia Sonic-2 supports language-switching within a voice
const VOICE_ID_HINDI   = 'a0e99841-438c-4a64-b679-ae501e7d6091'; // Vanya
const VOICE_ID_ENGLISH = '694f9389-aac1-45b6-b726-9d9369183238'; // Barbra

function getVoiceId(language: string): string {
  return language === 'en' ? VOICE_ID_ENGLISH : VOICE_ID_HINDI;
}

/**
 * Synthesise speech using Cartesia Sonic.
 * Returns a Buffer of MP3 audio bytes.
 */
export async function synthesise(
  text: string,
  language: string,
): Promise<Buffer | null> {
  const apiKey = process.env.CARTESIA_API_KEY;
  if (!apiKey) {
    console.warn('[TTS] CARTESIA_API_KEY not set — falling back to browser TTS');
    return null;
  }

  const cartesiaLang = CARTESIA_LANG_MAP[language] ?? 'hi';
  const voiceId      = getVoiceId(language);

  const response = await fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    headers: {
      'Cartesia-Version': '2025-04-16',
      'X-API-Key':        apiKey,
      'Content-Type':     'application/json',
    },
    body: JSON.stringify({
      model_id:      'sonic-2',
      transcript:    text,
      voice: {
        mode: 'id',
        id:   voiceId,
      },
      language:      cartesiaLang,
      output_format: {
        container:   'mp3',
        bit_rate:    128000,
        sample_rate: 44100,
      },
      _experimental_voice_controls: {
        speed:  'normal',
        emotion: ['positivity:low', 'curiosity'],  // warm, helpful tone
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[TTS] Cartesia failed (${response.status}): ${err}`);
    return null; // graceful fallback — client will use browser TTS
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** BCP-47 tags for client-side browser TTS fallback */
export const TTS_LANG_MAP: Record<string, string> = {
  hi: 'hi-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  en: 'en-IN',
};
