import { z } from 'zod';
import 'dotenv/config';

const EnvSchema = z.object({
  PORT:     z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  // ── Groq (Primary LLM + STT fallback) ──────────────────────────────────────
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY required'),

  // ── Deepgram (STT — Primary) ────────────────────────────────────────────────
  DEEPGRAM_API_KEY: z.string().min(1, 'DEEPGRAM_API_KEY required'),

  // ── ElevenLabs (TTS — Primary) ──────────────────────────────────────────────
  // Get from: https://elevenlabs.io/  (uses Multilingual v2 model)
  ELEVENLABS_API_KEY: z.string().optional(),

  // ── Cartesia (TTS — Legacy fallback) ───────────────────────────────────────
  // Optional — if not set, falls back to browser speechSynthesis
  CARTESIA_API_KEY: z.string().optional(),

  // ── LiveKit (Real-time audio transport) ─────────────────────────────────────
  // Optional — if not set, falls back to MediaRecorder polling
  LIVEKIT_API_KEY:    z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  LIVEKIT_URL:        z.string().url().optional(),  // wss://your-project.livekit.cloud

  // ── Supabase (Database + file storage) ──────────────────────────────────────
  SUPABASE_URL:         z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),

  // ── Auth ─────────────────────────────────────────────────────────────────────
  JWT_SECRET: z.string().min(32),

  // ── Legacy / optional keys (kept for gradual migration) ──────────────────────
  ANTHROPIC_API_KEY:       z.string().optional(),
  CLAUDE_PRIMARY_MODEL:    z.string().optional(),
  CLAUDE_ESCALATION_MODEL: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
