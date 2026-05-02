/**
 * BolKe API Service — matches Model_&_API.md §7 contracts exactly
 *
 * Mode selection (automatic):
 *   - VITE_API_BASE_URL is set  → uses backend (full pipeline)
 *   - VITE_API_BASE_URL is empty → uses direct AI providers (Gemini/Groq/NVIDIA/Pollinations)
 *     This is the current mode. No backend required.
 */

import { API_BASE_URL, DEMO_MODE, DEMO_RESPONSES } from '../utils/constants.js';
import {
  getAIReply,
  transcribeWithGroq,
  speakReply,
} from './aiProviders.js';

// True when VITE_GEMINI_API_KEY or VITE_GROQ_API_KEY exists
const HAS_AI_KEYS = !!(
  import.meta.env.VITE_GEMINI_API_KEY ||
  import.meta.env.VITE_GROQ_API_KEY ||
  import.meta.env.VITE_NVIDIA_API_KEY
);

/**
 * Send voice audio for processing.
 * - Backend mode: POST /v1/voice (multipart)
 * - Direct AI mode: Groq Whisper STT → AI cascade → browser TTS
 *
 * @param {Blob} audioBlob - WebM/Opus audio blob from MediaRecorder
 * @param {string} deviceId - Anonymous device UUID
 * @param {string|null} langHint - Optional language hint
 * @returns {Promise<Object>} Voice response matching API contract
 */
export async function sendVoiceQuery(audioBlob, deviceId, langHint = null) {
  // Demo mode — simulate backend response
  if (DEMO_MODE && !HAS_AI_KEYS) {
    return simulateDemoResponse();
  }

  // Direct AI mode — no backend needed
  if (!API_BASE_URL) {
    return runDirectAIPipeline(audioBlob, langHint);
  }

  // Backend mode — forward to Fastify gateway
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('device_id', deviceId);
  if (langHint) formData.append('client_lang_hint', langHint);

  const token = localStorage.getItem('bolke_token');
  const response = await fetch(`${API_BASE_URL}/v1/voice`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new VoiceApiError(
      error.error_code || 'NETWORK_ERROR',
      error.user_message || 'Maaf kijiye, dobara bolen.',
      error.user_message_audio_url || null
    );
  }

  return response.json();
}

/**
 * Direct AI pipeline — runs entirely in the browser.
 * STT (Groq Whisper) → Intent AI (Gemini/Groq/NVIDIA) → TTS (browser)
 */
async function runDirectAIPipeline(audioBlob, langHint) {
  const startTime = Date.now();

  // 1. STT — Groq Whisper (with WAV fallback built into transcribeWithGroq)
  let transcript, language;
  try {
    ({ transcript, language } = await transcribeWithGroq(audioBlob, langHint));
  } catch (sttErr) {
    console.error('[STT] Groq Whisper failed:', sttErr.message);
    throw new VoiceApiError('STT_FAILED', 'Saaf nahi suna, dobara bolen.', null);
  }

  if (!transcript) {
    throw new VoiceApiError('STT_EMPTY', 'Kuch nahi suna. Dobara bolen.', null);
  }

  // 2. AI intent parsing — cascade through all providers
  let aiReply;
  try {
    aiReply = await getAIReply(transcript, language);
  } catch (err) {
    if (err.message.startsWith('RATE_LIMITED:')) {
      throw new VoiceApiError('RATE_LIMITED', err.message.split(':')[1], null);
    }
    throw err;
  }

  // 3. TTS — play reply using browser speechSynthesis
  //    (non-blocking: we return the response immediately, audio plays alongside)
  speakReply(aiReply.reply, aiReply.language).catch(() => {});

  return {
    request_id:      `direct_${Date.now()}`,
    transcript,
    language:        aiReply.language,
    reply_text:      aiReply.reply,
    reply_audio_url: null,          // handled by speakReply() above
    tts_mode:        'browser',
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
 * Send a text-based chat message.
 * Direct mode: calls AI cascade directly.
 */
export async function sendChatMessage(message, language = 'hi') {
  if (!API_BASE_URL) {
    const startTime = Date.now();
    const aiReply = await getAIReply(message);
    speakReply(aiReply.reply, aiReply.language).catch(() => {});
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

  const token = localStorage.getItem('bolke_token');
  const response = await fetch(`${API_BASE_URL}/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, language }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new VoiceApiError(
      error.error_code || 'CHAT_ERROR',
      error.user_message || 'Message bhejne mein dikkat aayi.',
      null
    );
  }

  return response.json();
}

/**
 * Trigger an action via n8n — Model_&_API.md §7.4
 */
export async function triggerAction(intent, params = {}) {
  if (!API_BASE_URL) {
    return { queued: true, estimated_seconds: 0, sms_will_arrive: false };
  }

  const token = localStorage.getItem('bolke_token');
  const response = await fetch(`${API_BASE_URL}/v1/action/${intent}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) throw new Error('Action failed');
  return response.json();
}

/**
 * Check backend health — Model_&_API.md §7.5
 */
export async function checkHealth() {
  if (!API_BASE_URL) {
    return {
      status: 'direct-ai',
      gemini: import.meta.env.VITE_GEMINI_API_KEY ? 'ok' : 'no-key',
      groq:   import.meta.env.VITE_GROQ_API_KEY   ? 'ok' : 'no-key',
      nvidia: import.meta.env.VITE_NVIDIA_API_KEY  ? 'ok' : 'no-key',
      tts:    'browser',
      stt:    'groq-whisper',
    };
  }

  const response = await fetch(`${API_BASE_URL}/v1/health`);
  return response.json();
}

/**
 * Simulate a backend response for demo mode (no keys at all)
 */
function simulateDemoResponse() {
  return new Promise((resolve) => {
    const responses = Object.values(DEMO_RESPONSES);
    const response = responses[Math.floor(Math.random() * responses.length)];
    setTimeout(() => resolve({ ...response }), 1500 + Math.random() * 1000);
  });
}

/**
 * Custom error class for voice API errors
 */
class VoiceApiError extends Error {
  constructor(code, userMessage, audioUrl) {
    super(userMessage);
    this.name = 'VoiceApiError';
    this.code = code;
    this.userMessage = userMessage;
    this.audioUrl = audioUrl;
  }
}

/**
 * Generate or retrieve anonymous device ID
 */
export function getDeviceId() {
  let deviceId = localStorage.getItem('bolke_device_id');
  if (!deviceId) {
    deviceId = 'web_' + crypto.randomUUID();
    localStorage.setItem('bolke_device_id', deviceId);
  }
  return deviceId;
}
