/**
 * googleTts.ts — REPLACED with free Browser speechSynthesis
 *
 * Google Cloud TTS is NOT free:
 *   - Wavenet voices: $16 per 1 million characters
 *   - No meaningful free tier for production use
 *   - Requires a GCP service account JSON (paid billing account)
 *
 * This file now proxies to browserTts.ts.
 * The backend returns null audio; the frontend speaks with speechSynthesis.
 */
export { synthesise, TTS_LANG_MAP } from './browserTts.js';
