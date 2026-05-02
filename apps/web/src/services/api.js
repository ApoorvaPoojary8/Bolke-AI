/**
 * BolKe API Service — matches Model_&_API.md §7 contracts exactly
 *
 * NEW STACK:
 *  STT: Deepgram Nova-3      (replaces Groq Whisper as primary)
 *  LLM: Groq Llama 3.3 70B  (remains primary)
 *  TTS: Cartesia Sonic-2     (replaces browser speechSynthesis)
 *  Transport: LiveKit        (optional real-time; falls back to MediaRecorder)
 *
 * Mode selection (automatic):
 *   VITE_API_BASE_URL set  → backend pipeline (Fastify)
 *   VITE_API_BASE_URL empty → Direct AI pipeline (browser → APIs)
 */

import { API_BASE_URL, DEMO_MODE, DEMO_RESPONSES } from '../utils/constants.js';
import {
  getAIReply,
  transcribeWithDeepgram,
  transcribeWithGroq,
  speakWithCartesia,
  speakReply,
} from './aiProviders.js';

// True when at least one AI key is available
const HAS_AI_KEYS = !!(
  import.meta.env.VITE_GROQ_API_KEY ||
  import.meta.env.VITE_DEEPGRAM_API_KEY ||
  import.meta.env.VITE_GEMINI_API_KEY
);

// ── Primary TTS dispatcher ────────────────────────────────────────────────────
// Use Cartesia if key available, else browser speechSynthesis
export async function speak(text, language = 'hi') {
  if (import.meta.env.VITE_CARTESIA_API_KEY) {
    return speakWithCartesia(text, language);
  }
  return speakReply(text, language);
}

// ── Primary STT dispatcher ────────────────────────────────────────────────────
// Use Deepgram if key available, else Groq Whisper
async function transcribe(audioBlob, langHint) {
  if (import.meta.env.VITE_DEEPGRAM_API_KEY) {
    try {
      return await transcribeWithDeepgram(audioBlob, langHint);
    } catch (err) {
      console.warn('[STT] Deepgram failed, falling back to Groq Whisper:', err.message);
    }
  }
  // Groq Whisper fallback
  return transcribeWithGroq(audioBlob, langHint);
}

/**
 * sendVoiceQuery — Send voice audio for processing.
 *
 * @param {Blob} audioBlob - WebM/Opus audio blob from MediaRecorder
 * @param {string} deviceId - Anonymous device UUID
 * @param {string|null} langHint - Optional language hint
 */
export async function sendVoiceQuery(audioBlob, deviceId, langHint = null) {
  if (DEMO_MODE && !HAS_AI_KEYS) {
    return simulateDemoResponse();
  }

  // Direct AI mode (no backend)
  if (!API_BASE_URL) {
    return runDirectAIPipeline(audioBlob, langHint);
  }

  // Backend mode — forward to Fastify
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('device_id', deviceId);
  if (langHint) formData.append('client_lang_hint', langHint);

  const token    = localStorage.getItem('bolke_token');
  const response = await fetch(`${API_BASE_URL}/v1/voice`, {
    method:  'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body:    formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new VoiceApiError(
      error.error_code    || 'NETWORK_ERROR',
      error.user_message  || 'Maaf kijiye, dobara bolen.',
      error.user_message_audio_url || null,
    );
  }

  return response.json();
}

/**
 * Direct AI pipeline — Deepgram STT → Groq LLM → Cartesia TTS
 */
async function runDirectAIPipeline(audioBlob, langHint) {
  const startTime = Date.now();

  // 1. STT — Deepgram Nova-3 → Groq Whisper fallback
  let transcript, language;
  try {
    ({ transcript, language } = await transcribe(audioBlob, langHint));
  } catch (sttErr) {
    console.error('[STT] All STT providers failed:', sttErr.message);
    throw new VoiceApiError('STT_FAILED', 'Saaf nahi suna, dobara bolen.', null);
  }

  if (!transcript) {
    throw new VoiceApiError('STT_EMPTY', 'Kuch nahi suna. Dobara bolen.', null);
  }

  // 2. AI intent parsing — Groq 70B primary cascade
  let aiReply;
  try {
    aiReply = await getAIReply(transcript, language);
  } catch (err) {
    if (err.message.startsWith('RATE_LIMITED:')) {
      throw new VoiceApiError('RATE_LIMITED', err.message.split(':')[1], null);
    }
    throw err;
  }

  // 3. TTS — Cartesia Sonic-2 → browser fallback (non-blocking)
  speak(aiReply.reply, aiReply.language).catch(() => {});

  return {
    request_id:      `direct_${Date.now()}`,
    transcript,
    language:        aiReply.language,
    reply_text:      aiReply.reply,
    reply_audio_url: null,    // handled by speak() above
    tts_mode:        import.meta.env.VITE_CARTESIA_API_KEY ? 'cartesia' : 'browser',
    intent:          aiReply.intent,
    icon:            aiReply.icon,
    action:          aiReply.action_url
      ? { type: 'link', label: 'Kholein', url: aiReply.action_url }
      : null,
    confidence:      aiReply.confidence,
    _provider:       aiReply._provider,
    latency_ms:      Date.now() - startTime,
  };
}

/**
 * sendChatMessage — Text-based chat (uses Groq LLM + Cartesia TTS)
 */
export async function sendChatMessage(message, language = 'hi') {
  if (!API_BASE_URL) {
    const startTime = Date.now();
    const aiReply   = await getAIReply(message);
    speak(aiReply.reply, aiReply.language).catch(() => {});
    return {
      request_id:      `chat_${Date.now()}`,
      transcript:      message,
      language:        aiReply.language,
      reply_text:      aiReply.reply,
      reply_audio_url: null,
      intent:          aiReply.intent,
      icon:            aiReply.icon,
      action:          null,
      latency_ms:      Date.now() - startTime,
    };
  }

  const token    = localStorage.getItem('bolke_token');
  const response = await fetch(`${API_BASE_URL}/v1/chat`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, language }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new VoiceApiError(
      error.error_code  || 'CHAT_ERROR',
      error.user_message || 'Message bhejne mein dikkat aayi.',
      null,
    );
  }

  return response.json();
}

/**
 * getLiveKitToken — Get a LiveKit room access token from the backend.
 * Used when VITE_LIVEKIT_URL is set for real-time audio streaming.
 */
export async function getLiveKitToken(room = null) {
  const token = localStorage.getItem('bolke_token');
  const response = await fetch(`${API_BASE_URL}/v1/livekit/token`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ...(room ? { room } : {}) }),
  });

  if (!response.ok) throw new Error('LiveKit token request failed');
  return response.json(); // { token, url, room }
}

/**
 * triggerAction — Trigger an n8n workflow action
 */
export async function triggerAction(intent, params = {}) {
  if (!API_BASE_URL) {
    return { queued: true, estimated_seconds: 0, sms_will_arrive: false };
  }

  const token    = localStorage.getItem('bolke_token');
  const response = await fetch(`${API_BASE_URL}/v1/action/${intent}`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) throw new Error('Action failed');
  return response.json();
}

/**
 * checkHealth — Check backend health and provider status
 */
export async function checkHealth() {
  if (!API_BASE_URL) {
    return {
      status:    'direct-ai',
      stt:       import.meta.env.VITE_DEEPGRAM_API_KEY ? 'deepgram' : (import.meta.env.VITE_GROQ_API_KEY ? 'groq-whisper' : 'browser'),
      llm:       import.meta.env.VITE_GROQ_API_KEY     ? 'groq'     : 'pollinations',
      tts:       import.meta.env.VITE_CARTESIA_API_KEY  ? 'cartesia' : 'browser',
      livekit:   import.meta.env.VITE_LIVEKIT_URL       ? 'ok'       : 'disabled',
      deepgram:  import.meta.env.VITE_DEEPGRAM_API_KEY  ? 'ok'       : 'no-key',
      groq:      import.meta.env.VITE_GROQ_API_KEY      ? 'ok'       : 'no-key',
      cartesia:  import.meta.env.VITE_CARTESIA_API_KEY  ? 'ok'       : 'no-key',
      gemini:    import.meta.env.VITE_GEMINI_API_KEY    ? 'ok'       : 'no-key',
    };
  }

  const response = await fetch(`${API_BASE_URL}/v1/health`);
  return response.json();
}

/**
 * Simulate a demo response (no keys at all)
 */
function simulateDemoResponse() {
  return new Promise((resolve) => {
    const responses = Object.values(DEMO_RESPONSES);
    const response  = responses[Math.floor(Math.random() * responses.length)];
    setTimeout(() => resolve({ ...response }), 1500 + Math.random() * 1000);
  });
}

/**
 * Custom error class for voice API errors
 */
class VoiceApiError extends Error {
  constructor(code, userMessage, audioUrl) {
    super(userMessage);
    this.name        = 'VoiceApiError';
    this.code        = code;
    this.userMessage = userMessage;
    this.audioUrl    = audioUrl;
  }
}

/**
 * getDeviceId — Anonymous device UUID (persisted in localStorage)
 */
export function getDeviceId() {
  let deviceId = localStorage.getItem('bolke_device_id');
  if (!deviceId) {
    deviceId = 'web_' + crypto.randomUUID();
    localStorage.setItem('bolke_device_id', deviceId);
  }
  return deviceId;
}
