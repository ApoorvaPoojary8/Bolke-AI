/**
 * groqStt.ts — Free STT via Groq Whisper API
 *
 * Alternative to Google Cloud STT (which requires a paid service account).
 * Groq's Whisper is FREE with a generous rate limit (~100 audio sec/min).
 *
 * API Docs: https://console.groq.com/docs/speech-text
 * Supported languages: all 6 BolKe languages (hi, kn, ta, te, bn, mr).
 */

import FormData from 'form-data';

// Language code mapping: ISO 639-1 → Whisper language name
const LANG_HINT_MAP: Record<string, string> = {
  hi: 'hindi',
  kn: 'kannada',
  ta: 'tamil',
  te: 'telugu',
  bn: 'bengali',
  mr: 'marathi',
  en: 'english',
};

export async function transcribeAudio(
  audioBuffer: Buffer,
  langHint?: string,
): Promise<{ transcript: string; language: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set in environment');

  const form = new FormData();
  // Groq Whisper accepts webm, mp4, mp3, wav, ogg, flac, m4a
  form.append('file', audioBuffer, {
    filename: 'audio.webm',
    contentType: 'audio/webm',
  });
  form.append('model', 'whisper-large-v3-turbo'); // fastest + most accurate on Groq
  form.append('response_format', 'verbose_json');  // includes detected language

  // Pass language hint to improve accuracy (optional but helpful)
  if (langHint && LANG_HINT_MAP[langHint]) {
    form.append('language', langHint); // Whisper uses ISO 639-1 codes directly
  }

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...form.getHeaders(),
    },
    body: form as any,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq STT failed (${response.status}): ${err}`);
  }

  const data = await response.json() as { text: string; language?: string };

  // Whisper returns full language name (e.g. "hindi") — convert back to ISO code
  const detectedLangFull = (data.language ?? 'hindi').toLowerCase();
  const language =
    Object.entries(LANG_HINT_MAP).find(([, name]) => name === detectedLangFull)?.[0] ?? langHint ?? 'hi';

  return {
    transcript: data.text.trim(),
    language,
  };
}
