/**
 * BolKe — Multi-Provider AI Service (Frontend)
 *
 * STACK:
 *  STT: Deepgram Nova-3        — best Indian language accuracy, real-time capable
 *  LLM: Groq Llama 3.3 70B    — primary (ultra-fast LPU, JSON mode)
 *       Groq Llama 3.1 8B     — fast fallback
 *       Pollinations           — last resort (no key needed)
 *  TTS: ElevenLabs Multilingual v2 — primary (high-quality, dialect-accurate)
 *       Cartesia Sonic-2       — secondary fallback
 *       Browser speechSynthesis — last resort (free, built-in)
 *
 * Transport: LiveKit (optional, for real-time streaming mode)
 *            MediaRecorder (default, works without LiveKit)
 */

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are BolKe, a voice assistant for low-literacy users in rural India.

RULES (must follow exactly):
1. Reply in the SAME language the user spoke (detect from input).
2. Keep your reply to ONE simple sentence — short words, no jargon.
3. Use respectful "aap" form (formal you), never "tu".
4. NEVER invent government scheme names, helpline numbers, or amounts. If unsure, set intent to "unknown".
5. Output STRICT JSON only — no markdown, no preamble.

Allowed intents: ration, hospital, bank, transport, pension, document, scheme_eligibility, unknown.
Allowed icons: hospital, ration, bank, transport, pension, document, phone, unknown.

Output schema (return ONLY this JSON, nothing else):
{"reply":"string","intent":"ration|hospital|bank|transport|pension|document|scheme_eligibility|unknown","icon":"hospital|ration|bank|transport|pension|document|phone|unknown","language":"hi|kn|ta|te|bn|mr|en","action_url":null,"confidence":0.0}`;

// ── Rate Limiter ──────────────────────────────────────────────────────────────
const RATE_LIMIT_MAX    = 20;
const RATE_LIMIT_WINDOW = 10 * 60 * 1000;
const RATE_LIMIT_KEY    = 'bolke_rl';

const RATE_LIMIT_MSG = {
  hi: 'Bahut saare sawal ho gaye. 10 minute baad dobara poochh.',
  kn: 'Bahala prashnagalu aagide. 10 nimisha nantara keloli.',
  ta: 'Athigamana kettavigal. 10 nimidangal kazhinthu kelu.',
  te: 'Chala prashnavulu avindi. 10 nimishala taruvata adugandi.',
  bn: 'Onek proshno hoyeche. 10 minit pore jiggesh korun.',
  mr: 'Khup prashna zale. 10 minutantar vicharaa.',
  en: 'Too many requests. Please wait 10 minutes.',
};

function checkRateLimit(lang = 'hi') {
  const now = Date.now();
  let rl;
  try { rl = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '{}'); } catch { rl = {}; }

  if (!rl.windowStart || now - rl.windowStart > RATE_LIMIT_WINDOW) {
    rl = { windowStart: now, count: 0 };
  }
  if (rl.count >= RATE_LIMIT_MAX) {
    const msg = RATE_LIMIT_MSG[lang] ?? RATE_LIMIT_MSG.en;
    throw new Error(`RATE_LIMITED:${msg}`);
  }
  rl.count += 1;
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(rl));
}

// ── Safe fallback ─────────────────────────────────────────────────────────────
const SAFE_FALLBACK = {
  reply:      'Maaf kijiye, abhi samajh nahi aaya. Dobara bolen.',
  intent:     'unknown',
  icon:       'unknown',
  language:   'hi',
  action_url: null,
  confidence: 0,
};

// ── JSON parser ───────────────────────────────────────────────────────────────
function parseAIResponse(raw) {
  try {
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!parsed.reply || !parsed.intent || !parsed.language) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ── Retry helper ──────────────────────────────────────────────────────────────
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`[API] 429 rate-limited, retrying in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    return res;
  }
  throw new Error('429: Rate limit exceeded after retries');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LLM PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Provider 1: Groq Llama 3.3 70B (PRIMARY) ─────────────────────────────────
async function callGroq(transcript) {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  if (!key) throw new Error('No Groq key');

  const res = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${key}`,
    },
    body: JSON.stringify({
      model:           'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: transcript },
      ],
      max_tokens:      300,
      temperature:     0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`Groq 70B ${res.status}`);
  const data   = await res.json();
  const raw    = data.choices?.[0]?.message?.content ?? '';
  const parsed = parseAIResponse(raw);
  if (!parsed) throw new Error('Groq 70B: invalid JSON');
  return parsed;
}

// ── Provider 2: Groq Llama 3.1 8B (FAST FALLBACK) ────────────────────────────
async function callGroqFast(transcript) {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  if (!key) throw new Error('No Groq key');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${key}`,
    },
    body: JSON.stringify({
      model:       'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: transcript },
      ],
      max_tokens:  300,
      temperature: 0.1,
    }),
  });

  if (!res.ok) throw new Error(`Groq 8B ${res.status}`);
  const data   = await res.json();
  const raw    = data.choices?.[0]?.message?.content ?? '';
  const parsed = parseAIResponse(raw);
  if (!parsed) throw new Error('Groq 8B: invalid JSON');
  return parsed;
}

// ── Provider 3: Gemini Flash (SECONDARY FALLBACK) ─────────────────────────────
async function callGemini(transcript) {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error('No Gemini key');

  const res = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: transcript }], role: 'user' }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.1 },
      }),
    },
  );

  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data   = await res.json();
  const raw    = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const parsed = parseAIResponse(raw);
  if (!parsed) throw new Error('Gemini: invalid JSON');
  return parsed;
}

// ── Provider 4: Pollinations (LAST RESORT — no key needed) ────────────────────
async function callPollinations(transcript) {
  const prompt = encodeURIComponent(
    `${SYSTEM_PROMPT}\n\nUser said: ${transcript}\n\nRespond with ONLY the JSON object.`
  );
  const res = await fetch(
    `https://text.pollinations.ai/${prompt}?model=openai&json=true`,
    { method: 'GET' }
  );
  if (!res.ok) throw new Error(`Pollinations ${res.status}`);
  const raw    = await res.text();
  const parsed = parseAIResponse(raw);
  if (!parsed) throw new Error('Pollinations: invalid JSON');
  return parsed;
}

// ── Main AI Router ────────────────────────────────────────────────────────────
export async function getAIReply(transcript, lang = 'hi') {
  checkRateLimit(lang);

  const providers = [
    { name: 'Groq-70B',      fn: callGroq },
    { name: 'Groq-8B',       fn: callGroqFast },
    { name: 'Gemini',        fn: callGemini },
    { name: 'Pollinations',  fn: callPollinations },
  ];

  for (const { name, fn } of providers) {
    try {
      const result = await fn(transcript);
      console.log(`[AI] ${name} responded successfully`);
      return { ...result, _provider: name };
    } catch (err) {
      if (err.message.startsWith('RATE_LIMITED:')) throw err;
      console.warn(`[AI] ${name} failed:`, err.message);
    }
  }

  console.error('[AI] All providers failed — returning safe fallback');
  return { ...SAFE_FALLBACK, _provider: 'fallback' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STT — DEEPGRAM NOVA-3 (Primary)
// ═══════════════════════════════════════════════════════════════════════════════

// Deepgram language codes
const DG_LANG_MAP = {
  hi: 'hi',
  kn: 'kn',
  ta: 'ta',
  te: 'te',
  bn: 'bn',
  mr: 'mr',
  en: 'en-IN',
};

/**
 * transcribeWithDeepgram — Primary STT using Deepgram Nova-3
 * Replaces transcribeWithGroq as the primary STT provider.
 *
 * Deepgram advantages over Groq Whisper:
 *  - Native real-time streaming support
 *  - Better accuracy for Indian accents (Nova-3 model)
 *  - Language auto-detection built in
 *  - 200 hrs/month free tier
 */
export async function transcribeWithDeepgram(audioBlob, langHint = null) {
  const key = import.meta.env.VITE_DEEPGRAM_API_KEY;
  if (!key) throw new Error('No Deepgram key for STT');

  const dgLang = langHint ? (DG_LANG_MAP[langHint] ?? 'hi') : 'hi';

  const params = new URLSearchParams({
    model:           'nova-3',
    language:        dgLang,
    detect_language: 'true',
    punctuate:       'true',
    smart_format:    'true',
  });

  // Strip codec suffix from MIME type
  const mimeType = (audioBlob.type || 'audio/webm').split(';')[0].trim();

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method:  'POST',
    headers: {
      Authorization:  `Token ${key}`,
      'Content-Type': mimeType,
    },
    body: audioBlob,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Deepgram STT failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const channel    = data.results?.channels?.[0];
  const transcript = channel?.alternatives?.[0]?.transcript?.trim() ?? '';
  const detectedDg = channel?.detected_language ?? null;

  // Normalize Deepgram's BCP-47 code back to our ISO 639-1
  let language = langHint ?? 'hi';
  if (detectedDg) {
    const base = detectedDg.split('-')[0].toLowerCase();
    if (DG_LANG_MAP[base]) language = base;
  }

  return { transcript, language };
}

// ── STT: Groq Whisper (Fallback) ──────────────────────────────────────────────
function encodeWav(audioBuffer) {
  const sampleRate = audioBuffer.sampleRate;
  const samples    = audioBuffer.getChannelData(0);
  const length     = samples.length;
  const buffer     = new ArrayBuffer(44 + length * 2);
  const view       = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, length * 2, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  return buffer;
}

async function convertBlobToWav(audioBlob) {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const AudioCtx    = window.AudioContext || window['webkitAudioContext'];
  const audioCtx    = new AudioCtx();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();
  return new Blob([encodeWav(audioBuffer)], { type: 'audio/wav' });
}

export async function transcribeWithGroq(audioBlob, langHint = null) {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  if (!key) throw new Error('No Groq key for STT');

  const baseType = (audioBlob.type || 'audio/webm').split(';')[0].trim();
  let filename   = 'recording.webm';
  if (baseType === 'audio/mp4' || baseType === 'audio/m4a') filename = 'recording.mp4';
  else if (baseType === 'audio/ogg') filename = 'recording.ogg';
  else if (baseType === 'audio/wav') filename = 'recording.wav';

  const attemptTranscription = async (blob, fname) => {
    const form = new FormData();
    form.append('file', blob, fname);
    form.append('model', 'whisper-large-v3-turbo');
    form.append('response_format', 'verbose_json');
    if (langHint) form.append('language', langHint);

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method:  'POST',
      headers: { Authorization: `Bearer ${key}` },
      body:    form,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq STT failed (${res.status}): ${err}`);
    }
    return res.json();
  };

  const LANG_MAP = {
    hindi: 'hi', kannada: 'kn', tamil: 'ta', telugu: 'te',
    bengali: 'bn', marathi: 'mr', english: 'en',
  };

  let data;
  try {
    const cleanBlob = new Blob([audioBlob], { type: baseType });
    data = await attemptTranscription(cleanBlob, filename);
  } catch (firstErr) {
    try {
      console.warn('[STT] Groq first attempt failed, converting to WAV:', firstErr.message);
      const wavBlob = await convertBlobToWav(audioBlob);
      data = await attemptTranscription(wavBlob, 'recording.wav');
    } catch {
      throw firstErr;
    }
  }

  const detectedLang = LANG_MAP[(data.language ?? 'hindi').toLowerCase()] ?? langHint ?? 'hi';
  return { transcript: data.text.trim(), language: detectedLang };
}

// ── STT: Browser Web Speech (Offline fallback) ────────────────────────────────
export function transcribeWithBrowser(langHint = 'hi') {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { reject(new Error('Browser STT not supported')); return; }

    const recognition = new SpeechRecognition();
    const langMap = { hi: 'hi-IN', kn: 'kn-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN', en: 'en-IN' };
    recognition.lang             = langMap[langHint] ?? 'hi-IN';
    recognition.interimResults   = false;
    recognition.maxAlternatives  = 1;

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      resolve({ transcript, language: langHint });
    };
    recognition.onerror = (e) => reject(new Error(`Browser STT error: ${e.error}`));
    recognition.start();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TTS — ELEVENLABS MULTILINGUAL V2 (Primary)
// ═══════════════════════════════════════════════════════════════════════════════

// ElevenLabs voice IDs
const EL_VOICE_FEMALE = 'EXAVITQu4vr4xnSDxMaL'; // Rachel — warm, conversational
const EL_VOICE_MALE   = 'pNInz6obpgDQGcFmaJgB'; // Adam — deep, professional

/**
 * speakWithElevenLabs — High-quality TTS using ElevenLabs Multilingual v2.
 * Supports all Indian languages via the multilingual model.
 * Falls back to Cartesia → browser speechSynthesis.
 */
export async function speakWithElevenLabs(text, language = 'hi') {
  const key = import.meta.env.VITE_ELEVENLABS_API_KEY;

  if (!key) {
    console.warn('[TTS] No ElevenLabs key, trying Cartesia fallback');
    return speakWithCartesia(text, language);
  }

  const voiceId = language === 'en' ? EL_VOICE_MALE : EL_VOICE_FEMALE;

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method:  'POST',
      headers: {
        'xi-api-key':   key,
        'Content-Type': 'application/json',
        Accept:         'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability:        0.5,
          similarity_boost:  0.8,
          style:            0.3,
          use_speaker_boost: true,
        },
      }),
    });

    if (!res.ok) throw new Error(`ElevenLabs TTS failed (${res.status})`);

    const audioBuffer = await res.arrayBuffer();
    const blob        = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const url         = URL.createObjectURL(blob);
    const audio       = new Audio(url);

    return new Promise((resolve) => {
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      audio.play().catch(() => {
        URL.revokeObjectURL(url);
        resolve();
      });
    });
  } catch (err) {
    console.warn('[TTS] ElevenLabs failed, trying Cartesia fallback:', err.message);
    return speakWithCartesia(text, language);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TTS — CARTESIA SONIC-2 (Secondary Fallback)
// ═══════════════════════════════════════════════════════════════════════════════

const CARTESIA_LANG_MAP = {
  hi: 'hi', kn: 'kn', ta: 'ta', te: 'te', bn: 'bn', mr: 'mr', en: 'en',
};

// Cartesia voice IDs
const VOICE_HINDI   = 'a0e99841-438c-4a64-b679-ae501e7d6091'; // Vanya — warm, clear
const VOICE_ENGLISH = '694f9389-aac1-45b6-b726-9d9369183238'; // Barbra — professional

/**
 * speakWithCartesia — Secondary TTS using Cartesia Sonic-2.
 * Falls back to browser speechSynthesis if key is missing.
 */
export async function speakWithCartesia(text, language = 'hi') {
  const key = import.meta.env.VITE_CARTESIA_API_KEY;

  if (!key) {
    return speakReply(text, language);
  }

  const cartesiaLang = CARTESIA_LANG_MAP[language] ?? 'hi';
  const voiceId      = language === 'en' ? VOICE_ENGLISH : VOICE_HINDI;

  try {
    const res = await fetch('https://api.cartesia.ai/tts/bytes', {
      method:  'POST',
      headers: {
        'Cartesia-Version': '2025-04-16',
        'X-API-Key':        key,
        'Content-Type':     'application/json',
      },
      body: JSON.stringify({
        model_id:   'sonic-2',
        transcript: text,
        voice: { mode: 'id', id: voiceId },
        language:   cartesiaLang,
        output_format: {
          container:   'mp3',
          bit_rate:    128000,
          sample_rate: 44100,
        },
        _experimental_voice_controls: {
          speed:   'normal',
          emotion: ['positivity:low', 'curiosity'],
        },
      }),
    });

    if (!res.ok) throw new Error(`Cartesia TTS failed (${res.status})`);

    const audioBuffer = await res.arrayBuffer();
    const blob        = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const url         = URL.createObjectURL(blob);
    const audio       = new Audio(url);

    return new Promise((resolve) => {
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      audio.play().catch(() => {
        URL.revokeObjectURL(url);
        resolve();
      });
    });
  } catch (err) {
    console.warn('[TTS] Cartesia failed, falling back to browser TTS:', err.message);
    return speakReply(text, language);
  }
}

// ── TTS: Browser speechSynthesis (Offline / no-key fallback) ──────────────────
export function speakReply(text, language = 'hi') {
  const LANG_MAP = {
    hi: 'hi-IN', kn: 'kn-IN', ta: 'ta-IN',
    te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN', en: 'en-IN',
  };

  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();

    const utter   = new SpeechSynthesisUtterance(text);
    utter.lang    = LANG_MAP[language] ?? 'hi-IN';
    utter.rate    = 0.9;
    utter.pitch   = 1.05;

    const voices  = window.speechSynthesis.getVoices();
    const match   = voices.find(v => v.lang.startsWith(language));
    if (match) utter.voice = match;

    utter.onend   = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}
