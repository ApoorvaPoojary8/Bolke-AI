/**
 * googleStt.ts — REPLACED with free Groq Whisper STT
 *
 * Google Cloud STT is NOT free in production:
 *   - Free tier: only 60 minutes/month
 *   - After that: $0.024 / minute (~₹2/min)
 *   - Also requires a GCP service account JSON file (billing account needed)
 *
 * This file now proxies to groqStt.ts which uses Groq Whisper (free).
 * No other files need to be changed.
 */
export { transcribeAudio } from './groqStt.js';
