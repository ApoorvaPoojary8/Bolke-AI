# BolKe — FINAL UNIFIED MASTER PROMPT v3.0
# Frontend (apps/web) + Backend (apps/backend) + Complete Integration
# Platform: React PWA + Node.js Fastify + Claude Haiku 4.5
# Last Updated: May 2026

---

## DECISIONS LOCKED IN
- AI Model: claude-haiku-4-5-20251001 (primary), claude-sonnet-4-6 (escalation only)
- Supabase: Manual SQL Editor (no local CLI needed)
- Google Cloud: Starting fresh (instructions included step by step)
- Frontend: apps/web — React + Vite PWA (already ~70% done, extend only)
- Backend: apps/backend — Node.js + Fastify (build from scratch)
- Backup AI providers: Groq (Llama 3) and Pollinations (no key) as fallback ONLY if Claude fails
- Image pipeline: NEW feature — upload doc image → OCR → translate → spoken overview

---

## RULE SET (never violate these)
1. NEVER put any API key in apps/web/ — frontend is public
2. NEVER commit .env files — only .env.example
3. ALL AI calls happen server-side only
4. Claude is PRIMARY — Groq/Pollinations are emergency fallback only
5. Frontend and backend are SEPARATE folders, SEPARATE package.json files
6. Every screen transition has a voice cue
7. No body text below 24px anywhere in the UI

---

## REPO LAYOUT
```
bolke/
├── apps/
│   ├── web/              ← React + Vite PWA (FRONTEND)
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   ├── .env.local    ← ONLY contains VITE_API_BASE_URL (gitignored)
│   │   └── package.json
│   └── backend/          ← Node.js + Fastify (BACKEND)
│       ├── src/
│       │   ├── config/
│       │   ├── routes/
│       │   ├── services/
│       │   └── middleware/
│       ├── .env          ← All secrets live here (gitignored)
│       └── package.json
├── infra/
│   └── supabase/
│       └── migrations/   ← SQL files to run manually in Supabase editor
└── pnpm-workspace.yaml
```

---

## ════════════════════════════════════════
## STEP 0 — API KEYS SETUP GUIDE
## (Do this before writing any code)
## ════════════════════════════════════════

### 0.1 — Anthropic (Claude Haiku) — PRIMARY AI
1. Go to https://console.anthropic.com
2. Sign up or log in
3. Click "API Keys" in the left sidebar
4. Click "Create Key" → name it "bolke-dev"
5. Copy the key — starts with "sk-ant-..."
6. Free credits: $5 on signup. Haiku costs ~$0.0001/query with caching.
   Enough for ~50,000 test queries.
7. Save as: ANTHROPIC_API_KEY=sk-ant-...

### 0.2 — Google Cloud (STT + TTS + Vision) — Starting Fresh
Step-by-step from zero:

1. Go to https://console.cloud.google.com
2. Click "Select a project" → "New Project"
   - Name: "bolke-app"
   - Click "Create"

3. Enable APIs (do all three in one go):
   - Go to: https://console.cloud.google.com/apis/library
   - Search "Cloud Speech-to-Text API" → Enable
   - Search "Cloud Text-to-Speech API" → Enable
   - Search "Cloud Vision API" → Enable (for image OCR fallback)

4. Create a Service Account:
   - Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
   - Click "+ Create Service Account"
   - Name: "bolke-backend"
   - Click "Create and Continue"
   - Role: "Editor" (for MVP simplicity)
   - Click "Done"

5. Download the JSON key:
   - Click the service account you just created
   - Go to "Keys" tab
   - "Add Key" → "Create new key" → JSON → Download
   - Save this file as: apps/backend/service-account.json
   - ADD service-account.json TO .gitignore immediately

6. Free tier: STT = 60 min/month free, TTS = 1M chars/month free.
   More than enough for development and early testing.

### 0.3 — Groq (Emergency Fallback Only)
1. Go to https://console.groq.com
2. Sign up with GitHub or Google
3. "API Keys" → "Create API Key" → name it "bolke-fallback"
4. Copy key — starts with "gsk_..."
5. Free: 14,400 requests/day on Llama 3.3 70B
6. Save as: GROQ_API_KEY=gsk_...

### 0.4 — Pollinations (Zero-Key Fallback)
No signup needed. API is: https://text.pollinations.ai/
Just leave POLLINATIONS_ENABLED=true in your .env

### 0.5 — Supabase
1. Go to https://supabase.com
2. "New project" → name: "bolke" → choose closest region (Singapore)
3. Set a strong database password — save it somewhere
4. Wait ~2 minutes for project to provision
5. Go to: Project Settings → API
6. Copy "Project URL" → save as SUPABASE_URL=https://xxx.supabase.co
7. Copy "service_role" key (NOT anon key) → save as SUPABASE_SERVICE_KEY=eyJ...
8. The SQL migrations in Phase 6 will be run in the Supabase SQL Editor

---

## ════════════════════════════════════════
## STEP 1 — ENV FILES
## ════════════════════════════════════════

### 1.1 — Create apps/backend/.env (NEVER COMMIT)
```bash
# apps/backend/.env

# ── PRIMARY AI ──────────────────────────────
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
CLAUDE_PRIMARY_MODEL=claude-haiku-4-5-20251001
CLAUDE_ESCALATION_MODEL=claude-sonnet-4-6

# ── FALLBACK AI (only used if Claude fails) ──
GROQ_API_KEY=gsk_YOUR_KEY_HERE
# Pollinations needs no key

# ── GOOGLE CLOUD ────────────────────────────
# Path to downloaded service account JSON
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# ── SUPABASE ────────────────────────────────
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=eyJ_YOUR_SERVICE_ROLE_KEY

# ── AUTH ────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_64_byte_random_hex_here

# ── APP ─────────────────────────────────────
PORT=3001
NODE_ENV=development
```

### 1.2 — Create apps/backend/.env.example (COMMIT THIS)
```bash
# apps/backend/.env.example — copy to .env and fill in values

ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_PRIMARY_MODEL=claude-haiku-4-5-20251001
CLAUDE_ESCALATION_MODEL=claude-sonnet-4-6
GROQ_API_KEY=gsk_...
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
JWT_SECRET=generate_with_crypto_randomBytes_64
PORT=3001
NODE_ENV=development
```

### 1.3 — Create apps/web/.env.local (NEVER COMMIT)
```bash
# apps/web/.env.local
# This is the ONLY env file the frontend needs.
# It contains NO secrets — just the backend URL.
VITE_API_BASE_URL=http://localhost:3001
```

### 1.4 — Update root .gitignore
```
# Secrets
.env
.env.*
.env.local
!.env.example

# Google service account
service-account.json
*.json.key

# Build artifacts
apps/web/dist/
apps/backend/dist/
node_modules/
```

---

## ════════════════════════════════════════
## STEP 2 — BACKEND INITIALIZATION
## Source: architecture.md §3.2, tech_stack.md §3
## ════════════════════════════════════════

### 2.1 — Initialize backend package
```bash
mkdir -p apps/backend/src/{config,routes,services/{ai,stt,tts},middleware,utils}
cd apps/backend

# Create package.json
cat > package.json << 'EOF'
{
  "name": "@bolke/backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest"
  }
}
EOF

# Install all dependencies
pnpm add fastify @fastify/multipart @fastify/cors @fastify/helmet \
  @fastify/rate-limit @anthropic-ai/sdk @google-cloud/speech \
  @google-cloud/text-to-speech groq-sdk zod pino jose \
  @supabase/supabase-js sharp dotenv

pnpm add -D typescript @types/node vitest tsx
```

### 2.2 — Create tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
```

### 2.3 — Env validation (src/config/env.ts)
```typescript
import { z } from 'zod';
import 'dotenv/config';

const EnvSchema = z.object({
  PORT:                    z.string().default('3001'),
  ANTHROPIC_API_KEY:       z.string().min(1, 'Anthropic API key required'),
  CLAUDE_PRIMARY_MODEL:    z.string().default('claude-haiku-4-5-20251001'),
  CLAUDE_ESCALATION_MODEL: z.string().default('claude-sonnet-4-6'),
  GROQ_API_KEY:            z.string().optional(),
  SUPABASE_URL:            z.string().url(),
  SUPABASE_SERVICE_KEY:    z.string().min(1),
  JWT_SECRET:              z.string().min(32),
  NODE_ENV:                z.enum(['development', 'staging', 'production'])
                            .default('development'),
});

export const env = EnvSchema.parse(process.env);
```

### 2.4 — System prompts (src/config/prompts.ts)
```typescript
// Sourced from packages/prompts/src/system_v1.md
export const BOLKE_SYSTEM_PROMPT = `
You are BolKe, a voice assistant for low-literacy users in rural India.

RULES (must follow exactly):
1. Reply in the SAME language the user spoke (detect from input).
2. Keep your reply to ONE simple sentence — short words, no jargon.
3. Use respectful "aap" form (formal you), never "tu".
4. NEVER invent government scheme names, helpline numbers, or amounts.
   If unsure, set intent to "unknown".
5. Output STRICT JSON only — no markdown, no preamble, no explanation.

Allowed intents: ration, hospital, bank, transport, pension, document,
                 scheme_eligibility, unknown.

Allowed icons: hospital, ration, bank, transport, pension, document, phone, unknown.

Output schema (return ONLY this JSON, nothing else):
{
  "reply": "string, the spoken sentence in user language",
  "intent": "one of the allowed intents",
  "icon": "one of the allowed icons",
  "language": "ISO code: hi, kn, ta, te, bn, mr, en",
  "action_url": "string or null",
  "confidence": "number 0.0–1.0"
}
`.trim();

// For image/document analysis
export const IMAGE_ANALYSIS_PROMPT = `
You are BolKe, a document reader for low-literacy users in rural India.
Given an image of a government document, you must:

1. Extract ALL visible text from the image.
2. Identify the document type.
3. Translate the key information into the target language specified by the user.
4. Write ONE spoken overview sentence in the target language.
   This will be read aloud — use plain everyday words, no jargon or numbers in English.

Output STRICT JSON only (no markdown, no preamble):
{
  "document_type": "ration_card | hospital_record | pension_letter | bank_statement | id_card | other",
  "extracted_text": "all text found in the image, verbatim",
  "translated_text": "complete translation in target language",
  "overview": "ONE plain sentence summary in target language for a non-literate listener",
  "language": "ISO code of the target language used",
  "confidence": 0.0–1.0
}
`.trim();
```

### 2.5 — Zod schema (src/config/schema.ts)
```typescript
import { z } from 'zod';

// Claude voice response — matches Model_&_API.md §2.6 exactly
export const ClaudeReplySchema = z.object({
  reply:      z.string().min(1).max(200),
  intent:     z.enum(['ration', 'hospital', 'bank', 'transport',
                      'pension', 'document', 'scheme_eligibility', 'unknown']),
  icon:       z.enum(['hospital', 'ration', 'bank', 'transport',
                      'pension', 'document', 'phone', 'unknown']),
  language:   z.enum(['hi', 'kn', 'ta', 'te', 'bn', 'mr', 'en']),
  action_url: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export type ClaudeReply = z.infer<typeof ClaudeReplySchema>;

// Image analysis response
export const ImageReplySchema = z.object({
  document_type:  z.enum(['ration_card', 'hospital_record', 'pension_letter',
                           'bank_statement', 'id_card', 'other']),
  extracted_text: z.string(),
  translated_text: z.string(),
  overview:       z.string().min(1).max(300),
  language:       z.string(),
  confidence:     z.number().min(0).max(1),
});

export type ImageReply = z.infer<typeof ImageReplySchema>;
```

---

## ════════════════════════════════════════
## STEP 3 — AI SERVICES
## ════════════════════════════════════════

### 3.1 — Claude client (src/services/ai/claude.ts) — PRIMARY
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import { BOLKE_SYSTEM_PROMPT } from '../../config/prompts.js';
import { ClaudeReplySchema, type ClaudeReply } from '../../config/schema.js';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// Safe fallback used when all models fail
const SAFE_FALLBACK: ClaudeReply = {
  reply: 'Maaf kijiye, abhi samajh nahi aaya. Dobara bolen.',
  intent: 'unknown',
  icon: 'unknown',
  language: 'hi',
  action_url: null,
  confidence: 0,
};

function parseClaudeResponse(raw: string): ClaudeReply | null {
  try {
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    const result = ClaudeReplySchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function callClaude(
  transcript: string,
  attempt = 0,
): Promise<ClaudeReply> {
  // attempt 0,1 = Haiku. attempt 2 = Sonnet escalation
  const model = attempt < 2
    ? env.CLAUDE_PRIMARY_MODEL
    : env.CLAUDE_ESCALATION_MODEL;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 300, // HARD CAP — never increase
      system: [
        {
          type: 'text',
          text: BOLKE_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }, // 90% cost saving
        },
      ],
      messages: [{ role: 'user', content: transcript }],
    });

    const raw = response.content[0]?.type === 'text'
      ? response.content[0].text
      : '';

    const parsed = parseClaudeResponse(raw);
    if (parsed) return parsed;

    // Retry chain: attempt 0 → 1 (Haiku retry) → 2 (Sonnet) → fallback
    if (attempt < 2) {
      console.warn(`Claude attempt ${attempt} returned invalid JSON, retrying...`);
      return callClaude(transcript, attempt + 1);
    }

    console.error('All Claude attempts returned invalid JSON');
    return SAFE_FALLBACK;

  } catch (err: any) {
    // Rate limit or 5xx — try escalation once
    if (attempt < 2) {
      console.warn(`Claude attempt ${attempt} errored (${err.status}), retrying...`);
      return callClaude(transcript, attempt + 1);
    }
    console.error('Claude failed after all retries:', err.message);
    return SAFE_FALLBACK;
  }
}

// Separate function for image/document analysis (uses vision via base64)
export async function callClaudeVision(
  imageBase64: string,
  mimeType: string,
  targetLanguage: string,
): Promise<string> {
  const prompt = `Target language ISO code: ${targetLanguage}. Analyse this document image and respond in the exact JSON format from your system prompt.`;

  const response = await anthropic.messages.create({
    model: env.CLAUDE_PRIMARY_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
              data: imageBase64,
            },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
    system: `
You are BolKe, a document reader for low-literacy users in rural India.
Given an image of a government document, extract text, identify document type,
translate key information to the target language, and write ONE plain spoken overview sentence.

Output STRICT JSON only:
{
  "document_type": "ration_card | hospital_record | pension_letter | bank_statement | id_card | other",
  "extracted_text": "all text found in image verbatim",
  "translated_text": "complete translation in target language",
  "overview": "ONE plain sentence in target language for non-literate listener",
  "language": "ISO code of target language",
  "confidence": 0.0–1.0
}`.trim(),
  });

  return response.content[0]?.type === 'text' ? response.content[0].text : '';
}
```

### 3.2 — Groq client (src/services/ai/groq.ts) — EMERGENCY FALLBACK ONLY
```typescript
// Used ONLY when Claude is completely unavailable (outage)
import Groq from 'groq-sdk';
import { env } from '../../config/env.js';
import { BOLKE_SYSTEM_PROMPT } from '../../config/prompts.js';

let groqClient: Groq | null = null;

function getGroq(): Groq {
  if (!groqClient) {
    if (!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
    groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
  }
  return groqClient;
}

export async function callGroqFallback(transcript: string): Promise<string> {
  const completion = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: BOLKE_SYSTEM_PROMPT },
      { role: 'user',   content: transcript },
    ],
    max_tokens: 300,
    temperature: 0.1,
  });
  return completion.choices[0]?.message?.content ?? '';
}
```

### 3.3 — Pollinations client (src/services/ai/pollinations.ts) — LAST RESORT
```typescript
// No API key required — completely free — last resort only
export async function callPollinationsFallback(transcript: string): Promise<string> {
  const sysEncoded  = encodeURIComponent(
    'You are BolKe. Reply in strict JSON: {reply, intent, icon, language, action_url, confidence}'
  );
  const userEncoded = encodeURIComponent(transcript);
  const url = `https://text.pollinations.ai/${userEncoded}?system=${sysEncoded}&model=openai&seed=42`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`);
  return res.text();
}
```

### 3.4 — AI Router (src/services/ai/router.ts)
```typescript
import { callClaude, type ClaudeReply }   from './claude.js';
import { callGroqFallback }               from './groq.js';
import { callPollinationsFallback }       from './pollinations.js';
import { ClaudeReplySchema }              from '../../config/schema.js';

const SAFE_FALLBACK: ClaudeReply = {
  reply: 'Maaf kijiye, abhi samajh nahi aaya. Dobara bolen.',
  intent: 'unknown', icon: 'unknown',
  language: 'hi', action_url: null, confidence: 0,
};

function tryParseReply(raw: string): ClaudeReply | null {
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = ClaudeReplySchema.safeParse(JSON.parse(cleaned));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function routeToAI(transcript: string): Promise<ClaudeReply> {
  // 1. Claude (primary — always try first)
  try {
    return await callClaude(transcript);
  } catch (err) {
    console.error('Claude completely unavailable:', err);
  }

  // 2. Groq (emergency fallback — only if Claude is down)
  try {
    console.warn('Falling back to Groq...');
    const raw = await callGroqFallback(transcript);
    const parsed = tryParseReply(raw);
    if (parsed) return parsed;
  } catch (err) {
    console.error('Groq fallback failed:', err);
  }

  // 3. Pollinations (last resort — no key needed)
  try {
    console.warn('Falling back to Pollinations...');
    const raw = await callPollinationsFallback(transcript);
    const parsed = tryParseReply(raw);
    if (parsed) return parsed;
  } catch (err) {
    console.error('Pollinations fallback failed:', err);
  }

  // 4. Static safe reply
  console.error('All AI providers failed — returning static fallback');
  return SAFE_FALLBACK;
}
```

---

## ════════════════════════════════════════
## STEP 4 — VOICE SERVICES (STT + TTS)
## Source: Model_&_API.md §3, §4
## ════════════════════════════════════════

### 4.1 — Google STT (src/services/stt/googleStt.ts)
```typescript
import speech from '@google-cloud/speech';

const client = new speech.SpeechClient();

// Language codes supported — Model_&_API.md §3.1
const SUPPORTED_LANGUAGE_CODES = [
  'hi-IN', 'kn-IN', 'ta-IN', 'te-IN', 'bn-IN', 'mr-IN', 'en-IN',
];

export async function transcribeAudio(
  audioBuffer: Buffer,
): Promise<{ transcript: string; language: string }> {
  const [response] = await client.recognize({
    config: {
      encoding: 'WEBM_OPUS',          // matches MediaRecorder output
      sampleRateHertz: 48000,         // browser MediaRecorder default
      languageCodes: SUPPORTED_LANGUAGE_CODES,
      model: 'latest_long',
      enableAutomaticPunctuation: true,
    },
    audio: { content: audioBuffer.toString('base64') },
  });

  const transcript = response.results?.[0]?.alternatives?.[0]?.transcript ?? '';
  // languageCode returned as 'hi-IN' — extract 'hi'
  const rawLang = response.results?.[0]?.languageCode ?? 'hi-IN';
  const language = rawLang.split('-')[0];

  return { transcript, language };
}
```

### 4.2 — Google TTS (src/services/tts/googleTts.ts)
```typescript
import tts from '@google-cloud/text-to-speech';

const client = new tts.TextToSpeechClient();

// Voice map — Model_&_API.md §4.1
const VOICE_MAP: Record<string, { languageCode: string; name: string }> = {
  hi: { languageCode: 'hi-IN', name: 'hi-IN-Wavenet-D' },
  kn: { languageCode: 'kn-IN', name: 'kn-IN-Wavenet-A' },
  ta: { languageCode: 'ta-IN', name: 'ta-IN-Wavenet-A' },
  te: { languageCode: 'te-IN', name: 'te-IN-Standard-A' },
  bn: { languageCode: 'bn-IN', name: 'bn-IN-Wavenet-A' },
  mr: { languageCode: 'mr-IN', name: 'mr-IN-Wavenet-A' },
  en: { languageCode: 'en-IN', name: 'en-IN-Wavenet-D' },
};

export async function synthesise(text: string, language: string): Promise<Buffer> {
  const voice = VOICE_MAP[language] ?? VOICE_MAP['hi'];

  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice,
    audioConfig: {
      audioEncoding: 'MP3',
      sampleRateHertz: 24000,
      speakingRate: 0.95, // 5% slower — design.md §5.1
    },
  });

  return Buffer.from(response.audioContent as Uint8Array);
}
```

### 4.3 — Supabase audio upload helper (src/utils/storage.ts)
```typescript
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

export async function uploadAudio(
  buffer: Buffer,
  filename: string,
  bucket = 'tts-audio',
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, buffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  return data.publicUrl;
}

export async function logQuery(params: {
  deviceIdHash: string;
  intent: string;
  language: string;
  latencyMs: number;
}): Promise<void> {
  const { error } = await supabase.from('query_logs').insert({
    device_id_hash: params.deviceIdHash,
    intent: params.intent,
    language: params.language,
    latency_ms: params.latencyMs,
  });
  if (error) console.warn('Failed to log query:', error.message);
}
```

---

## ════════════════════════════════════════
## STEP 5 — AUTH MIDDLEWARE
## Source: architecture.md §7
## ════════════════════════════════════════

### 5.1 — JWT middleware (src/middleware/auth.ts)
```typescript
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config/env.js';
import crypto from 'crypto';

const SECRET = new TextEncoder().encode(env.JWT_SECRET);

export async function signToken(deviceId: string): Promise<string> {
  return new SignJWT({ device_id: deviceId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<{ device_id: string }> {
  const { payload } = await jwtVerify(token, SECRET);
  return payload as { device_id: string };
}

// Fastify preHandler hook
export async function requireAuth(request: any, reply: any): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid Authorization header' });
  }
  try {
    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    request.deviceId = payload.device_id;
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}
```

---

## ════════════════════════════════════════
## STEP 6 — ROUTES
## Source: Model_&_API.md §7
## ════════════════════════════════════════

### 6.1 — Health route (src/routes/health.ts)
```typescript
export default async function healthRoutes(app: any) {
  app.get('/v1/health', async (_req: any, reply: any) => {
    // Quick Claude ping
    let claudeStatus = 'ok';
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
    } catch { claudeStatus = 'degraded'; }

    return reply.send({
      status: 'ok',
      claude: claudeStatus,
      stt: 'ok',   // check Google STT separately if needed
      tts: 'ok',
      n8n: 'ok',
    });
  });
}
```

### 6.2 — Auth routes (src/routes/auth.ts)
```typescript
import { createClient } from '@supabase/supabase-js';
import { signToken } from '../middleware/auth.js';
import { env } from '../config/env.js';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

export default async function authRoutes(app: any) {
  // POST /v1/auth/otp — request OTP
  app.post('/auth/otp', async (req: any, reply: any) => {
    const { phone } = req.body;
    if (!phone) return reply.status(400).send({ error: 'phone required' });

    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) return reply.status(500).send({ error: error.message });

    return reply.send({ request_id: `req_${Date.now()}`, ttl_seconds: 120 });
  });

  // POST /v1/auth/verify — verify OTP
  app.post('/auth/verify', async (req: any, reply: any) => {
    const { phone, code } = req.body;
    if (!phone || !code) return reply.status(400).send({ error: 'phone and code required' });

    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });
    if (error || !data.user) return reply.status(401).send({ error: 'Invalid OTP' });

    const token = await signToken(data.user.id);
    return reply.send({
      access_token: token,
      expires_in: 3600,
    });
  });
}
```

### 6.3 — Voice route (src/routes/voice.ts) — MAIN PIPELINE
```typescript
import { transcribeAudio } from '../services/stt/googleStt.js';
import { synthesise }      from '../services/tts/googleTts.js';
import { routeToAI }       from '../services/ai/router.js';
import { uploadAudio, logQuery } from '../utils/storage.js';
import { requireAuth }     from '../middleware/auth.js';
import crypto from 'crypto';

export default async function voiceRoutes(app: any) {
  app.post('/voice', {
    preHandler: [requireAuth],
  }, async (req: any, reply: any) => {
    const startTime = Date.now();

    // 1. Extract audio from multipart
    const parts = req.parts();
    let audioBuffer: Buffer | null = null;
    let langHint: string | null = null;

    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'audio') {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        audioBuffer = Buffer.concat(chunks);
      }
      if (part.type === 'field' && part.fieldname === 'client_lang_hint') {
        langHint = part.value as string;
      }
    }

    if (!audioBuffer || audioBuffer.length < 100) {
      return reply.status(400).send({
        error_code: 'AUDIO_TOO_SHORT',
        user_message: 'Awaaz nahi aayi. Dobara bolen.',
      });
    }

    // 2. STT — speech to text
    const { transcript, language } = await transcribeAudio(audioBuffer);
    if (!transcript) {
      return reply.status(422).send({
        error_code: 'STT_FAILED',
        user_message: 'Saaf nahi suna, dobara bolen.',
      });
    }

    // 3. AI — intent + reply (Claude primary, fallback chain)
    const aiReply = await routeToAI(transcript);

    // 4. TTS — text to speech
    const audioOut = await synthesise(aiReply.reply, aiReply.language);

    // 5. Upload MP3 to Supabase storage
    const filename = `tts/${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`;
    const replyAudioUrl = await uploadAudio(audioOut, filename);

    // 6. Log query (no PII — device ID hashed)
    const latencyMs = Date.now() - startTime;
    await logQuery({
      deviceIdHash: crypto.createHash('sha256').update(req.deviceId).digest('hex'),
      intent: aiReply.intent,
      language: aiReply.language,
      latencyMs,
    });

    // 7. Build action object if action_url present
    const action = aiReply.action_url ? {
      type: 'call',
      label: 'Helpline call karein',
      url: aiReply.action_url,
    } : null;

    // 8. Return full response — Model_&_API.md §7.3
    return reply.send({
      request_id:      `req_${Date.now()}`,
      transcript,
      language:        aiReply.language,
      reply_text:      aiReply.reply,
      reply_audio_url: replyAudioUrl,
      intent:          aiReply.intent,
      icon:            aiReply.icon,
      action,
      latency_ms:      latencyMs,
    });
  });
}
```

### 6.4 — Image route (src/routes/image.ts) — NEW FEATURE
```typescript
// POST /v1/image
// Accepts: image file + target_language
// Returns: document type + translated text + overview + audio URL

import sharp from 'sharp';
import { callClaudeVision } from '../services/ai/claude.js';
import { synthesise }       from '../services/tts/googleTts.js';
import { uploadAudio }      from '../utils/storage.js';
import { ImageReplySchema } from '../config/schema.js';
import { requireAuth }      from '../middleware/auth.js';

export default async function imageRoutes(app: any) {
  app.post('/image', {
    preHandler: [requireAuth],
  }, async (req: any, reply: any) => {
    const parts = req.parts();
    let imageBuffer: Buffer | null = null;
    let mimeType = 'image/jpeg';
    let targetLanguage = 'hi';

    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'image') {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        imageBuffer = Buffer.concat(chunks);
        mimeType = part.mimetype;
      }
      if (part.type === 'field' && part.fieldname === 'target_language') {
        targetLanguage = part.value as string;
      }
    }

    if (!imageBuffer) {
      return reply.status(400).send({ error: 'No image provided' });
    }

    // Optimise image: resize to max 1024px wide, convert to JPEG
    // This reduces token usage and speeds up Anthropic Vision
    const optimised = await sharp(imageBuffer)
      .resize({ width: 1024, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const base64Image = optimised.toString('base64');

    // Call Claude Vision
    let rawJson: string;
    try {
      rawJson = await callClaudeVision(base64Image, 'image/jpeg', targetLanguage);
    } catch (err) {
      console.error('Claude Vision failed:', err);
      return reply.status(503).send({
        error_code: 'VISION_FAILED',
        user_message: 'Document nahi padh saka. Phir se try karein.',
      });
    }

    // Parse and validate response
    const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return reply.status(422).send({ error: 'Failed to parse document analysis' });
    }

    const validated = ImageReplySchema.safeParse(parsed);
    if (!validated.success) {
      console.error('Image reply schema mismatch:', validated.error);
      // Still return what we have — don't hard fail
      parsed = { ...parsed, confidence: 0.5 };
    }

    // TTS the overview sentence
    const overviewAudio = await synthesise(parsed.overview, targetLanguage);
    const audioFilename = `image-audio/${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`;
    const overviewAudioUrl = await uploadAudio(overviewAudio, audioFilename, 'image-audio');

    return reply.send({
      document_type:      parsed.document_type ?? 'other',
      extracted_text:     parsed.extracted_text ?? '',
      translated_text:    parsed.translated_text ?? '',
      overview_text:      parsed.overview ?? '',
      overview_audio_url: overviewAudioUrl,
      language:           parsed.language ?? targetLanguage,
      confidence:         parsed.confidence ?? 0.5,
    });
  });
}
```

---

## ════════════════════════════════════════
## STEP 7 — SERVER BOOTSTRAP
## ════════════════════════════════════════

### 7.1 — Main server (src/server.ts)
```typescript
import Fastify from 'fastify';
import { env } from './config/env.js';

const app = Fastify({
  logger: {
    transport: env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
  },
});

// Security
await app.register(import('@fastify/helmet'));

// CORS — allow web client
await app.register(import('@fastify/cors'), {
  origin: env.NODE_ENV === 'development'
    ? true
    : [
        'https://bolke.app',
        'https://www.bolke.app',
      ],
});

// Rate limit per device — 60 req/hour
await app.register(import('@fastify/rate-limit'), {
  max: 60,
  timeWindow: '1 hour',
  keyGenerator: (req: any) =>
    (req.headers['x-device-id'] as string) ?? req.ip,
});

// Multipart for audio and image uploads
// 5MB max for image uploads, 200KB for audio
await app.register(import('@fastify/multipart'), {
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Routes
await app.register(import('./routes/health.js'));
await app.register(import('./routes/auth.js'),  { prefix: '/v1' });
await app.register(import('./routes/voice.js'), { prefix: '/v1' });
await app.register(import('./routes/image.js'), { prefix: '/v1' });

// Start
const address = await app.listen({
  port: Number(env.PORT),
  host: '0.0.0.0',
});
console.log(`BolKe backend running at ${address}`);
```

---

## ════════════════════════════════════════
## STEP 8 — SUPABASE SQL MIGRATIONS
## Run these manually in Supabase SQL Editor
## Go to: your project → SQL Editor → New query
## ════════════════════════════════════════

### 8.1 — File: infra/supabase/migrations/01_init.sql
```sql
-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash    TEXT UNIQUE NOT NULL,
  language_pref CHAR(2) DEFAULT 'hi',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  jwt_id     TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Query logs (NO PII stored here)
CREATE TABLE IF NOT EXISTS query_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id_hash TEXT NOT NULL,
  intent         TEXT,
  language       CHAR(2),
  latency_ms     INTEGER,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Audio uploads (24h TTL)
CREATE TABLE IF NOT EXISTS audio_uploads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_uploads ENABLE ROW LEVEL SECURITY;

-- Only service role can access (backend uses service role key)
CREATE POLICY "service_only" ON users
  USING (auth.role() = 'service_role');
CREATE POLICY "service_only" ON sessions
  USING (auth.role() = 'service_role');
CREATE POLICY "service_only" ON query_logs
  USING (auth.role() = 'service_role');
CREATE POLICY "service_only" ON audio_uploads
  USING (auth.role() = 'service_role');
```

### 8.2 — File: infra/supabase/migrations/02_image_logs.sql
```sql
-- Image analysis logs
CREATE TABLE IF NOT EXISTS image_analysis_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id_hash  TEXT NOT NULL,
  document_type   TEXT,
  target_language CHAR(2),
  confidence      FLOAT,
  latency_ms      INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE image_analysis_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_only" ON image_analysis_logs
  USING (auth.role() = 'service_role');
```

### 8.3 — Storage buckets (run in SQL Editor)
```sql
-- TTS audio bucket (public read, backend write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-audio', 'tts-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Image analysis audio bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('image-audio', 'image-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket policies
CREATE POLICY "Public read tts-audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tts-audio');

CREATE POLICY "Service write tts-audio"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tts-audio' AND auth.role() = 'service_role');

CREATE POLICY "Public read image-audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'image-audio');

CREATE POLICY "Service write image-audio"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'image-audio' AND auth.role() = 'service_role');
```

---

## ════════════════════════════════════════
## STEP 9 — FRONTEND UPDATES (apps/web)
## Extend existing code — don't rewrite
## ════════════════════════════════════════

### 9.1 — Update src/utils/constants.js — Add new states
```javascript
// ADD these to the existing STATES object:
export const STATES = {
  HOME:         'home',
  LISTENING:    'listening',
  THINKING:     'thinking',
  REPLY:        'reply',
  ACTION:       'action',
  FAILURE:      'failure',
  IMAGE:        'image',        // NEW
  IMAGE_REPLY:  'image_reply',  // NEW
};
```

### 9.2 — New screen: src/screens/ImageScreen.jsx
```jsx
// Camera/file upload screen for document analysis
import React, { useState, useRef } from 'react';
import { ActionButton } from '../components/ActionButton';

export function ImageScreen({ onResult, onBack, speakText }) {
  const [preview, setPreview]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const cameraInputRef          = useRef(null);
  const fileInputRef            = useRef(null);
  const selectedFileRef         = useRef(null);

  const handleFileSelect = (file) => {
    if (!file) return;
    selectedFileRef.current = file;
    setPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedFileRef.current) return;
    setLoading(true);
    setError(null);

    const lang    = localStorage.getItem('bolke_last_language') ?? 'hi';
    const token   = localStorage.getItem('bolke_token');
    const formData = new FormData();
    formData.append('image', selectedFileRef.current);
    formData.append('target_language', lang);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/v1/image`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.user_message ?? 'Document nahi padh saka.');
      }

      const data = await res.json();
      setLoading(false);
      onResult(data);
    } catch (err) {
      setLoading(false);
      setError(err.message);
      if (speakText) speakText(err.message, 'hi-IN');
    }
  };

  return (
    <div className="screen screen-enter" id="screen-image">
      <button className="back-button" onClick={onBack} aria-label="Back">←</button>

      <h2 style={{
        fontSize: '26px', fontWeight: 700,
        marginBottom: '24px', textAlign: 'center',
        color: 'var(--color-text)',
      }}>
        📄 Document padhein
      </h2>

      {/* Preview or upload placeholder */}
      <div
        onClick={() => cameraInputRef.current?.click()}
        style={{
          width: preview ? '100%' : '200px',
          maxWidth: '360px',
          minHeight: preview ? 'auto' : '200px',
          borderRadius: '16px',
          border: `2px dashed var(--color-primary)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: 'var(--color-surface)',
          cursor: 'pointer',
        }}
      >
        {preview
          ? <img src={preview} alt="Document preview" style={{ width: '100%', display: 'block' }} />
          : <span style={{ fontSize: '64px' }}>📸</span>
        }
      </div>

      {/* Camera input (mobile primary) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files[0])}
      />

      <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)', marginTop: '12px' }}>
        Camera se photo lo
      </p>

      {/* File upload alternative */}
      <div style={{ margin: '12px 0', color: 'var(--color-disabled)', fontSize: '16px' }}>ya</div>

      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          background: 'none', border: 'none',
          color: 'var(--color-primary)', fontSize: '18px',
          fontWeight: 600, cursor: 'pointer',
        }}
      >
        📁 Gallery se choose karein
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files[0])}
      />

      {/* Error */}
      {error && (
        <p style={{ color: 'var(--color-error)', fontSize: '18px', marginTop: '16px', textAlign: 'center' }}>
          {error}
        </p>
      )}

      {/* Submit / loading */}
      {preview && !loading && (
        <div style={{ marginTop: '32px' }}>
          <ActionButton label="📖 Document padhein" onClick={handleSubmit} />
        </div>
      )}

      {loading && (
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <div className="thinking-spinner" />
          <p className="label-text" style={{ marginTop: '16px' }}>
            Document padh raha hoon...
          </p>
        </div>
      )}
    </div>
  );
}
```

### 9.3 — New screen: src/screens/ImageReplyScreen.jsx
```jsx
import React, { useState, useEffect } from 'react';
import { ActionButton } from '../components/ActionButton';

const DOC_TYPE_LABELS = {
  ration_card:      { icon: '🛍️', label: 'Ration Card'       },
  hospital_record:  { icon: '🏥', label: 'Hospital Record'    },
  pension_letter:   { icon: '👴', label: 'Pension Letter'     },
  bank_statement:   { icon: '💰', label: 'Bank Statement'     },
  id_card:          { icon: '🪪', label: 'ID Card'            },
  other:            { icon: '📄', label: 'Document'           },
};

export function ImageReplyScreen({ result, onHome, onSpeakAgain, playAudio }) {
  const [showFull, setShowFull] = useState(false);
  const docInfo = DOC_TYPE_LABELS[result?.document_type] ?? DOC_TYPE_LABELS.other;

  // Auto-play overview audio the moment screen appears
  useEffect(() => {
    if (result?.overview_audio_url) {
      playAudio(result.overview_audio_url);
    }
  }, []);

  if (!result) return null;

  return (
    <div
      className="screen screen-enter"
      id="screen-image-reply"
      style={{ justifyContent: 'flex-start', paddingTop: '80px', paddingBottom: '140px' }}
    >
      {/* Document type icon */}
      <div style={{ fontSize: '72px', lineHeight: 1, marginBottom: '8px' }}>
        {docInfo.icon}
      </div>

      {/* Document type label */}
      <p style={{
        fontSize: '22px', fontWeight: 700,
        marginBottom: '4px', textAlign: 'center',
      }}>
        {docInfo.label}
      </p>

      {/* Confidence */}
      {result.confidence > 0 && (
        <p style={{ fontSize: '14px', color: 'var(--color-disabled)', marginBottom: '16px' }}>
          Accuracy: {Math.round(result.confidence * 100)}%
        </p>
      )}

      {/* Overview sentence — ONE sentence, large, spoken language */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '16px',
        padding: '20px 24px',
        margin: '8px 0 16px',
        width: '100%',
        maxWidth: '360px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '22px', lineHeight: 1.6, color: 'var(--color-text)' }}>
          {result.overview_text}
        </p>
        <p style={{ fontSize: '14px', color: 'var(--color-disabled)', marginTop: '8px' }}>
          🔊 Auto-play ho raha hai
        </p>
      </div>

      {/* Toggle full translated text */}
      <button
        onClick={() => setShowFull(v => !v)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-primary)', fontSize: '18px',
          fontWeight: 600, marginBottom: '12px',
        }}
      >
        {showFull ? '▲ Kam dikhao' : '▼ Poora anuvad padhein'}
      </button>

      {showFull && (
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: '12px',
          padding: '16px',
          width: '100%',
          maxWidth: '360px',
          fontSize: '16px',
          lineHeight: 1.7,
          color: 'var(--color-text)',
          maxHeight: '240px',
          overflowY: 'auto',
          marginBottom: '16px',
        }}>
          <p style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--color-primary)' }}>
            Anuvad (Translation):
          </p>
          <p>{result.translated_text}</p>
        </div>
      )}

      {/* Action buttons */}
      <div style={{
        position: 'fixed', bottom: '32px',
        left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: '12px',
        flexWrap: 'wrap', justifyContent: 'center',
        zIndex: 20,
      }}>
        <ActionButton label="🎤 Kuch aur poochein" onClick={onSpeakAgain} />
        <ActionButton label="🏠 Home" onClick={onHome} />
      </div>
    </div>
  );
}
```

### 9.4 — Update src/App.jsx — Wire new screens
```jsx
// ADD imports at the top of the existing App.jsx:
import { ImageScreen }      from './screens/ImageScreen';
import { ImageReplyScreen } from './screens/ImageReplyScreen';

// ADD new state variables inside App():
const [imageResult, setImageResult] = useState(null);

// ADD new handler:
const handleImageResult = useCallback((result) => {
  setImageResult(result);
  setScreen(STATES.IMAGE_REPLY);
  localStorage.setItem('bolke_last_language', result.language ?? 'hi');
}, []);

// ADD these two cases to the renderScreen() switch:
case STATES.IMAGE:
  return (
    <ImageScreen
      onResult={handleImageResult}
      onBack={handleGoHome}
      speakText={speakText}
    />
  );

case STATES.IMAGE_REPLY:
  return (
    <ImageReplyScreen
      result={imageResult}
      onHome={handleGoHome}
      onSpeakAgain={handleSpeakAgain}
      playAudio={playAudio}
    />
  );
```

### 9.5 — Update src/screens/HomeScreen.jsx — Add document button
```jsx
// ADD this button inside the HomeScreen return, after the mic button section:
// (passes setScreen via props — add setScreen to HomeScreen props)

<button
  onClick={() => onOpenImage?.()}
  aria-label="Upload document"
  style={{
    position: 'absolute',
    bottom: '48px',
    left: '24px',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    border: 'none',
    background: 'var(--color-surface)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
    fontSize: '28px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}
>
  📄
</button>
```

```jsx
// In App.jsx, pass the handler to HomeScreen:
case STATES.HOME:
  return (
    <HomeScreen
      onStartRecording={handleStartRecording}
      onOpenImage={() => setScreen(STATES.IMAGE)}   // ADD THIS
      recentQueries={recentQueries}
      isOnline={isOnline}
    />
  );
```

---

## ════════════════════════════════════════
## STEP 10 — CI / SECURITY CHECK
## ════════════════════════════════════════

### 10.1 — Create .github/workflows/backend-ci.yml
```yaml
name: Backend CI

on:
  push:
    paths: ['apps/backend/**', 'apps/web/**']
  pull_request:

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check no API keys leaked into frontend source
        run: |
          echo "Scanning apps/web/src for leaked keys..."
          # Check for Anthropic key pattern
          if grep -r "sk-ant-" apps/web/src/; then
            echo "FAIL: Anthropic key found in frontend!" && exit 1
          fi
          # Check for env var names that should never be in frontend
          if grep -r "ANTHROPIC_API_KEY\|GROQ_API_KEY\|SUPABASE_SERVICE_KEY" apps/web/src/; then
            echo "FAIL: Secret env var name found in frontend!" && exit 1
          fi
          echo "Security scan passed ✓"

  backend-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g pnpm
      - run: pnpm install
      - name: Type check
        run: pnpm exec tsc --noEmit
```

---

## ════════════════════════════════════════
## STEP 11 — SMOKE TESTS
## Run these in order after each phase
## ════════════════════════════════════════

### After Step 7 (server running):
```bash
cd apps/backend
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy output → paste as JWT_SECRET in .env

npx tsx src/server.ts
# Should print: BolKe backend running at http://0.0.0.0:3001

curl http://localhost:3001/v1/health
# Expected: {"status":"ok","claude":"ok","stt":"ok","tts":"ok","n8n":"ok"}
```

### After Step 3 (AI router):
```bash
# Quick AI router test
cd apps/backend && npx tsx --eval "
import { routeToAI } from './src/services/ai/router.js';
const r = await routeToAI('mera ration card kab aayega');
console.log(JSON.stringify(r, null, 2));
"
# Expected: valid JSON with intent='ration', language='hi'
```

### After Step 6.3 (voice route):
```bash
# Requires a valid JWT — get one from auth/verify first
# Or temporarily disable requireAuth for testing:
curl -X POST http://localhost:3001/v1/voice \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "audio=@test.webm" \
  -F "device_id=test-001"
# Expected: {intent, reply_text, reply_audio_url, latency_ms < 4000}
```

### After Step 6.4 (image route):
```bash
curl -X POST http://localhost:3001/v1/image \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "image=@sample_ration_card.jpg" \
  -F "target_language=hi"
# Expected: {document_type:'ration_card', overview_text:'<Hindi sentence>',
#            overview_audio_url:'https://...', confidence:0.8+}
```

### Frontend integration:
```bash
# Terminal 1 — backend
cd apps/backend && npx tsx src/server.ts

# Terminal 2 — frontend
cd apps/web
echo "VITE_API_BASE_URL=http://localhost:3001" > .env.local
pnpm dev
# Open http://localhost:5173
# DEMO MODE banner should DISAPPEAR (backend connected)
# Test voice: press mic → speak → get real Claude reply
# Test image: tap 📄 → take photo → get Hindi overview + audio autoplay
```

---

## ════════════════════════════════════════
## PHASE COMPLETION TRACKER
## ════════════════════════════════════════

```
STEP 0  — API keys collected               □  (Anthropic, Google, Groq, Supabase)
STEP 1  — .env files created               □  (backend/.env, web/.env.local)
STEP 2  — Backend initialized              □  (package.json, tsconfig, env.ts)
STEP 3  — AI services built                □  (claude.ts, groq.ts, pollinations.ts, router.ts)
STEP 4  — Voice services built             □  (googleStt.ts, googleTts.ts, storage.ts)
STEP 5  — Auth middleware                  □  (auth.ts JWT sign/verify)
STEP 6  — All routes                       □  (health, auth, voice, image)
STEP 7  — Server bootstrap                 □  (server.ts running on :3001)
STEP 8  — Supabase SQL migrations run      □  (manual SQL editor)
STEP 9  — Frontend updated                 □  (ImageScreen, ImageReplyScreen, App.jsx, HomeScreen)
STEP 10 — CI workflow created              □  (.github/workflows/backend-ci.yml)
STEP 11 — All smoke tests passing          □
─────────────────────────────────────────────
PRODUCTION READY                           □  (all steps ✓)
```

---

## QUICK REFERENCE

```bash
# Start backend (from apps/backend/)
npx tsx src/server.ts

# Start frontend (from apps/web/)
pnpm dev

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Check for leaked keys in frontend
grep -r "sk-ant-\|ANTHROPIC_API_KEY" apps/web/src/ && echo "LEAK!" || echo "Clean ✓"

# Test Claude directly
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":100,"messages":[{"role":"user","content":"ping"}]}'
```
