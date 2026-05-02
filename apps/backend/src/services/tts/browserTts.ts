/**
 * browserTts.ts — Free TTS using Browser Web Speech API
 *
 * Alternative to Google Cloud TTS (which costs $16 per 1M characters).
 *
 * How it works:
 *   - The backend does NOT generate any audio file.
 *   - Instead, the backend returns `reply_text` + `language` in the JSON response.
 *   - The frontend uses window.speechSynthesis (built into every browser) to speak
 *     the reply text in the correct language — completely FREE.
 *
 * Language support: All 6 BolKe languages are supported by speechSynthesis
 * on Android Chrome, iOS Safari, and desktop browsers.
 *
 * This module exports a `synthesise` function that matches the old signature
 * but returns null (no audio buffer). The route handler checks for null and
 * omits the reply_audio_url field — the client then uses speechSynthesis.
 */

// BCP-47 language tags for speechSynthesis
export const TTS_LANG_MAP: Record<string, string> = {
  hi: 'hi-IN',   // Hindi
  kn: 'kn-IN',   // Kannada
  ta: 'ta-IN',   // Tamil
  te: 'te-IN',   // Telugu
  bn: 'bn-IN',   // Bengali
  mr: 'mr-IN',   // Marathi
  en: 'en-IN',   // English (Indian)
};

/**
 * Returns null — signals to the route handler that audio synthesis
 * is handled client-side via browser speechSynthesis.
 *
 * Kept async and matching the old signature so no other code needs to change.
 */
export async function synthesise(
  text: string,
  language: string,
): Promise<Buffer | null> {
  // No server-side audio generation needed.
  // The frontend will use:
  //   const utter = new SpeechSynthesisUtterance(replyText);
  //   utter.lang = TTS_LANG_MAP[language] ?? 'hi-IN';
  //   window.speechSynthesis.speak(utter);
  return null;
}
