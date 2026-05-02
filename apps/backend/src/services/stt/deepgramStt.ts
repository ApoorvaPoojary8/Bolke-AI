/**
 * deepgramStt.ts — Real-time STT via Deepgram Nova-3
 *
 * Replaces Google Cloud STT (paid service account) and Groq Whisper.
 * Deepgram Nova-3 supports all 6 BolKe Indian languages out of the box.
 *
 * Docs: https://developers.deepgram.com/docs/pre-recorded-audio
 * Supported languages: hi (Hindi), kn (Kannada), ta (Tamil), te (Telugu),
 *                      bn (Bengali), mr (Marathi), en (English)
 *
 * Free tier: 200 hrs/month (well above BolKe's expected usage).
 */

// Deepgram BCP-47 language codes for each BolKe language
const DG_LANG_MAP: Record<string, string> = {
  hi: 'hi',   // Hindi
  kn: 'kn',   // Kannada
  ta: 'ta',   // Tamil
  te: 'te',   // Telugu
  bn: 'bn',   // Bengali
  mr: 'mr',   // Marathi
  en: 'en-IN', // English (Indian accent model)
};

// Detect language from Deepgram's detected_language field (BCP-47 → ISO 639-1)
function normalizeDetectedLang(dg: string | undefined, fallback: string): string {
  if (!dg) return fallback;
  const base = dg.split('-')[0].toLowerCase();
  return DG_LANG_MAP[base] ? base : fallback;
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  langHint?: string,
  mimeType = 'audio/webm',
): Promise<{ transcript: string; language: string }> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error('DEEPGRAM_API_KEY is not set');

  const dgLang = langHint ? (DG_LANG_MAP[langHint] ?? 'hi') : 'hi';

  // Build query params — Nova-3 with punctuation + language detection
  const params = new URLSearchParams({
    model:              'nova-3',
    language:           dgLang,
    detect_language:    'true',   // auto-detect even if hint given
    punctuate:          'true',
    smart_format:       'true',   // normalise numbers, dates, etc.
    utterances:         'false',
    diarize:            'false',
  });

  const response = await fetch(
    `https://api.deepgram.com/v1/listen?${params}`,
    {
      method: 'POST',
      headers: {
        Authorization:  `Token ${apiKey}`,
        'Content-Type': mimeType,
      },
      // Convert Node.js Buffer → ArrayBuffer (valid BodyInit in strict TypeScript)
      body: audioBuffer.buffer.slice(
        audioBuffer.byteOffset,
        audioBuffer.byteOffset + audioBuffer.byteLength,
      ) as ArrayBuffer,
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Deepgram STT failed (${response.status}): ${err}`);
  }

  const data = await response.json() as {
    results?: {
      channels?: Array<{
        detected_language?: string;
        alternatives?: Array<{ transcript: string }>;
      }>;
    };
  };

  const channel = data.results?.channels?.[0];
  const transcript = channel?.alternatives?.[0]?.transcript?.trim() ?? '';
  const language = normalizeDetectedLang(channel?.detected_language, langHint ?? 'hi');

  return { transcript, language };
}
