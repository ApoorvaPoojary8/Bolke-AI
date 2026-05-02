/* BolKe API Service — matches Model_&_API.md §7 contracts exactly */

import { API_BASE_URL, DEMO_MODE, DEMO_RESPONSES } from '../utils/constants';

/**
 * Send voice audio to backend for processing
 * POST /v1/voice — Model_&_API.md §7.3
 *
 * @param {Blob} audioBlob - WebM/Opus audio blob from MediaRecorder
 * @param {string} deviceId - Anonymous device UUID
 * @param {string|null} langHint - Optional language hint
 * @returns {Promise<Object>} Voice response matching API contract
 */
export async function sendVoiceQuery(audioBlob, deviceId, langHint = null) {
  // Demo mode — simulate backend response
  if (DEMO_MODE) {
    return simulateDemoResponse();
  }

  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('device_id', deviceId);
  if (langHint) {
    formData.append('client_lang_hint', langHint);
  }

  const token = localStorage.getItem('bolke_token');

  const response = await fetch(`${API_BASE_URL}/v1/voice`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
 * Send a text-based chat message to backend
 * POST /v1/chat
 *
 * @param {string} message - Text message from user
 * @param {string} language - Language hint (hi, kn, ta, etc.)
 * @returns {Promise<Object>} Chat response with reply_text, intent, icon, etc.
 */
export async function sendChatMessage(message, language = 'hi') {
  if (DEMO_MODE) {
    return simulateDemoResponse();
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
  if (DEMO_MODE) {
    return { queued: true, estimated_seconds: 30, sms_will_arrive: true };
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
  if (DEMO_MODE) {
    return { status: 'demo', claude: 'ok', stt: 'ok', tts: 'ok', n8n: 'ok' };
  }

  const response = await fetch(`${API_BASE_URL}/v1/health`);
  return response.json();
}

/**
 * Simulate a backend response for demo mode
 */
function simulateDemoResponse() {
  return new Promise((resolve) => {
    const responses = Object.values(DEMO_RESPONSES);
    const response = responses[Math.floor(Math.random() * responses.length)];
    // Simulate network latency (1.5-2.5s)
    const delay = 1500 + Math.random() * 1000;
    setTimeout(() => resolve({ ...response }), delay);
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
