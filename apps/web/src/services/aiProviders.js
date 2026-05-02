/**
 * BolKe — Multi-Provider AI Service (Frontend)
 *
 * Replaces the backend Claude dependency with a client-side AI cascade.
 * Provider priority order (best for Indian languages + free tiers):
 *
 *  1. Gemini Flash 2.0  — best Indian language quality, generous free tier
 *  2. Groq Llama 3.3    — fastest inference, good free tier
 *  3. NVIDIA NIM        — free API credits (meta/llama-3.2-11b)
 *  4. Pollinations      — completely free, no key needed
 *  5. Safe fallback     — static response, always works
 *
 * STT priority:
 *  1. Groq Whisper      — free, most accurate for Indian accents
 *  2. Browser Web Speech API — built-in, no key needed
 */

// ── System prompt (matches Model_&_API.md §2.2 exactly) ─────────────────────
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
// Max 20 requests per 10 minutes (client-side, per device)
const RATE_LIMIT_MAX      = 20;
const RATE_LIMIT_WINDOW   = 10 * 60 * 1000; // 10 minutes in ms
const RATE_LIMIT_KEY      = 'bolke_rl';

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

  // Reset window if expired
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
  reply: 'Maaf kijiye, abhi samajh nahi aaya. Dobara bolen.',
  intent: 'unknown',
  icon: 'unknown',
  language: 'hi',
  action_url: null,
  confidence: 0,
};

// ── JSON parser (handles markdown fences) ─────────────────────────────────────
function parseAIResponse(raw) {
  try {
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    // Extract first {...} block in case of extra text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    // Validate required fields
    if (!parsed.reply || !parsed.intent || !parsed.language) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ── Retry helper with exponential backoff (handles 429s) ─────────────────────
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, options);

    if (res.status === 429) {
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`[API] 429 rate-limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }

    return res; // Return on any non-429 status
  }

  // All retries exhausted — throw so cascade moves to next provider
  throw new Error('429: Rate limit exceeded after retries');
}

// ── Provider 1: Google Gemini Flash ──────────────────────────────────────────
async function callGemini(transcript) {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error('No Gemini key');

  const res = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: transcript }], role: 'user' }],
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.1,
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const parsed = parseAIResponse(raw);
  if (!parsed) throw new Error('Gemini: invalid JSON');
  return parsed;
}

// ── Provider 2: Groq Llama ────────────────────────────────────────────────────
async function callGroq(transcript) {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  if (!key) throw new Error('No Groq key');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
      max_tokens: 300,
      temperature: 0.1,
    }),
  });

  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '';
  const parsed = parseAIResponse(raw);
  if (!parsed) throw new Error('Groq: invalid JSON');
  return parsed;
}

// ── Provider 3: NVIDIA NIM ────────────────────────────────────────────────────
async function callNvidia(transcript) {
  const key = import.meta.env.VITE_NVIDIA_API_KEY;
  const baseUrl = import.meta.env.VITE_NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  const model = import.meta.env.VITE_NVIDIA_TEXT_MODEL || 'minimaxai/minimax-m1';
  if (!key) throw new Error('No NVIDIA key');

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
      max_tokens: 300,
      temperature: 0.1,
    }),
  });

  if (!res.ok) throw new Error(`NVIDIA ${res.status}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '';
  const parsed = parseAIResponse(raw);
  if (!parsed) throw new Error('NVIDIA: invalid JSON');
  return parsed;
}

// ── Provider 4: Pollinations (free, no key needed) ────────────────────────────
async function callPollinations(transcript) {
  const prompt = encodeURIComponent(
    `${SYSTEM_PROMPT}\n\nUser said: ${transcript}\n\nRespond with ONLY the JSON object.`
  );
  const res = await fetch(
    `https://text.pollinations.ai/${prompt}?model=openai&json=true`,
    { method: 'GET' }
  );

  if (!res.ok) throw new Error(`Pollinations ${res.status}`);
  const raw = await res.text();
  const parsed = parseAIResponse(raw);
  if (!parsed) throw new Error('Pollinations: invalid JSON');
  return parsed;
}

// ── Main AI Router (cascade with fallback) ────────────────────────────────────
export async function getAIReply(transcript, lang = 'hi') {
  // Enforce rate limit before hitting any API
  checkRateLimit(lang);

  const providers = [
    { name: 'Gemini', fn: callGemini },    // best Indian language quality
    { name: 'Groq', fn: callGroq },        // fast fallback
    { name: 'NVIDIA', fn: callNvidia },    // free credits fallback
    { name: 'Pollinations', fn: callPollinations },
  ];

  for (const { name, fn } of providers) {
    try {
      const result = await fn(transcript);
      console.log(`[AI] ${name} responded successfully`);
      return { ...result, _provider: name };
    } catch (err) {
      // Re-throw rate limit errors immediately — don't cascade
      if (err.message.startsWith('RATE_LIMITED:')) throw err;
      console.warn(`[AI] ${name} failed:`, err.message);
    }
  }

  console.error('[AI] All providers failed — returning safe fallback');
  return { ...SAFE_FALLBACK, _provider: 'fallback' };
}

// ── WAV encoder helpers ───────────────────────────────────────────────────────
function encodeWav(audioBuffer) {
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.getChannelData(0); // mono
  const length = samples.length;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, 1, true);  // mono
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
  const AudioCtx = window.AudioContext || /** @type {typeof AudioContext} */ (window['webkitAudioContext']);
  const audioCtx = new AudioCtx();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();
  return new Blob([encodeWav(audioBuffer)], { type: 'audio/wav' });
}

// ── STT: Groq Whisper (Free, best for Indian accents) ─────────────────────────
export async function transcribeWithGroq(audioBlob, langHint = null) {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  if (!key) throw new Error('No Groq key for STT');

  // Strip codec suffix from MIME type (e.g. 'audio/webm;codecs=opus' → 'audio/webm')
  const baseType = (audioBlob.type || 'audio/webm').split(';')[0].trim();
  let filename = 'recording.webm';
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
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq STT failed (${res.status}): ${err}`);
    }
    return res.json();
  };

  // Map Whisper's full language name back to ISO code
  const LANG_MAP = {
    hindi: 'hi', kannada: 'kn', tamil: 'ta', telugu: 'te',
    bengali: 'bn', marathi: 'mr', english: 'en',
  };

  let data;
  try {
    // First attempt: send with clean MIME type (no codec qualifier)
    const cleanBlob = new Blob([audioBlob], { type: baseType });
    data = await attemptTranscription(cleanBlob, filename);
  } catch (firstErr) {
    // Second attempt: convert to WAV (universally supported by Whisper)
    try {
      console.warn('[STT] First attempt failed, converting to WAV:', firstErr.message);
      const wavBlob = await convertBlobToWav(audioBlob);
      data = await attemptTranscription(wavBlob, 'recording.wav');
    } catch {
      throw firstErr; // surface original error
    }
  }

  const detectedLang = LANG_MAP[(data.language ?? 'hindi').toLowerCase()] ?? langHint ?? 'hi';
  return { transcript: data.text.trim(), language: detectedLang };
}

// ── STT: Browser Web Speech API (built-in fallback) ───────────────────────────
export function transcribeWithBrowser(langHint = 'hi') {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      reject(new Error('Browser STT not supported'));
      return;
    }

    const recognition = new SpeechRecognition();
    const langMap = { hi: 'hi-IN', kn: 'kn-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN', en: 'en-IN' };
    recognition.lang = langMap[langHint] ?? 'hi-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      resolve({ transcript, language: langHint });
    };
    recognition.onerror = (e) => reject(new Error(`Browser STT error: ${e.error}`));
    recognition.start();
  });
}

// ── TTS: Browser speechSynthesis (free, built-in) ─────────────────────────────
export function speakReply(text, language = 'hi') {
  const LANG_MAP = {
    hi: 'hi-IN', kn: 'kn-IN', ta: 'ta-IN',
    te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN', en: 'en-IN',
  };

  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = LANG_MAP[language] ?? 'hi-IN';
    utter.rate = 0.9;   // slightly slower — design.md §5.1
    utter.pitch = 1.05; // slightly warm

    // Try to match an installed Indian voice
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find(v => v.lang.startsWith(language));
    if (match) utter.voice = match;

    utter.onend = () => resolve();
    utter.onerror = () => resolve(); // resolve anyway — don't crash on TTS error
    window.speechSynthesis.speak(utter);
  });
}
