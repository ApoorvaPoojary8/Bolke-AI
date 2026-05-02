# BolKe — STEP-BY-STEP IMPLEMENTATION MASTER PROMPT
### Complete Build Instructions: Zero → Production-Ready MVP

**Version:** 1.0 | **Last Updated:** May 2026
**All source files live in one folder:** `bolke_docs/`

```
bolke_docs/
├── PRD.md                ← what to build & acceptance criteria
├── architecture.md       ← system design & component map
├── design.md             ← screens, colours, voice persona
├── tech_stack.md         ← every approved library & service
├── Folder_Structure.md   ← where every file lives
└── Model_&_API.md        ← Claude prompt, API contracts, cost model
```

---

---IMPLEMENTATION PROMPT START---

## YOUR ROLE

You are the **BolKe Lead Engineer**.
You build everything in the order defined below.
You never skip a phase. You never invent a spec.
Every decision you make traces back to one of the 6 docs above.

**Before touching any code in a phase:**
1. State which doc section governs that phase.
2. Summarise what it says in 2–3 lines.
3. Then implement — exactly as specified.

---

## THE BUILD LADDER — 8 PHASES

```
PHASE 0 — Foundation & Repo Setup
PHASE 1 — Infrastructure: Supabase + Secrets + n8n VPS
PHASE 2 — Backend: Fastify Gateway (skeleton + auth)
PHASE 3 — AI Pipeline: STT → Claude → TTS
PHASE 4 — n8n Workflows: Government API Orchestration
PHASE 5 — Android App: Core UI + Voice + Playback
PHASE 6 — Android App: All 9 Screens + Offline Mode
PHASE 7 — Integration: Android ↔ Backend ↔ n8n (all 5 flows)
PHASE 8 — Hardening: Security, Resilience, Observability, CI/CD
```

Complete each phase fully. Run its smoke test before advancing.
A failing smoke test = do not proceed.

---

## ══════════════════════════════════════
## PHASE 0 — FOUNDATION & REPO SETUP
## Source: Folder_Structure.md §1–11, tech_stack.md §8–9
## ══════════════════════════════════════

### WHAT THE DOCS SAY
Folder_Structure.md §1 defines a pnpm monorepo rooted at `bolke/`.
tech_stack.md §8.3 mandates Doppler for secrets and GitHub Actions for CI/CD.
tech_stack.md §11 mandates MIT/Apache-2.0/BSD-3-Clause licenses only.

### STEP 0.1 — Create monorepo skeleton

Create this exact layout from Folder_Structure.md §1:

```bash
mkdir -p bolke/{apps/{android,backend},packages/{shared-types,prompts,i18n},\
workflows/n8n,infra/{docker,cloud-run,supabase/{migrations,seed,policies}},\
docs/adr,docs/runbooks,scripts/{ops,analytics,dev},.github/workflows}
```

Create root config files:

```
bolke/
├── package.json          # pnpm workspaces root
├── pnpm-workspace.yaml   # declares apps/* and packages/*
├── .editorconfig         # 2-space indent, LF line endings
├── .gitignore            # node_modules, .env, *.aab, *.apk, dist/
└── README.md             # project overview
```

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'apps/backend'
  - 'packages/*'
```

**Root .gitignore — critical entries:**
```
# Secrets — NEVER commit
.env
.env.*
doppler.yaml

# Build artefacts
apps/android/app/build/
apps/android/.gradle/
apps/backend/dist/
node_modules/

# IDE
.idea/
.vscode/
!.vscode/settings.json
```

### STEP 0.2 — Initialise shared-types package

```
packages/shared-types/
├── src/
│   ├── claude.ts          # ClaudeResponse + IntentSchema (zod)
│   ├── api.ts             # VoiceRequest / VoiceResponse shapes
│   └── index.ts           # barrel export
├── package.json
└── tsconfig.json
```

**packages/shared-types/src/claude.ts:**
```typescript
import { z } from 'zod';

// Sourced from Model_&_API.md §2.6 — do not change enum values
export const ClaudeReplySchema = z.object({
  reply:      z.string().min(1).max(200),
  intent:     z.enum(['ration','hospital','bank','transport',
                      'pension','document','scheme_eligibility','unknown']),
  icon:       z.enum(['hospital','ration','bank','transport',
                      'pension','document','phone','unknown']),
  language:   z.enum(['hi','kn','ta','te','bn','mr','en']),
  action_url: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export type ClaudeReply = z.infer<typeof ClaudeReplySchema>;
export type Intent = ClaudeReply['intent'];
export type Icon   = ClaudeReply['icon'];
```

### STEP 0.3 — Seed the prompts package

```
packages/prompts/src/system_v1.md
```

Contents must exactly match Model_&_API.md §2.2:

```
You are BolKe, a voice assistant for low-literacy users in rural India.

RULES (must follow exactly):
1. Reply in the SAME language the user spoke (detect from input).
2. Keep your `reply` to ONE simple sentence — short words, no jargon.
3. Use respectful "aap" form (formal you), never "tu".
4. NEVER invent government scheme names, helpline numbers, or amounts.
   If unsure, set intent to "unknown".
5. Output STRICT JSON only — no markdown, no preamble.

Allowed intents: ration, hospital, bank, transport, pension, document,
                 scheme_eligibility, unknown.

Allowed icons: hospital, ration, bank, transport, pension, document, phone, unknown.

Output schema:
{
  "reply": "string, the spoken sentence",
  "intent": "one of the allowed intents",
  "icon":   "one of the allowed icons",
  "language": "ISO code: hi, kn, ta, te, bn, mr, en",
  "action_url": "string or null",
  "confidence": "number 0.0–1.0"
}
```

### STEP 0.4 — Seed i18n strings

Create `packages/i18n/strings/hi.yaml` as the source of truth:

```yaml
# Hindi — source of truth for all user-facing strings
app_name: "BolKe"
mic_prompt: "Mic dabakar bolen"
listening: "Sun raha hoon..."
thinking: "Ek pal, soch raha hoon..."
failure_retry: "Maaf kijiye, dobara bolen."
no_internet: "Internet nahi hai, baad mein dobara bolen."
action_pending: "Aapka kaam shuru ho gaya, SMS aayega."
onboarding_welcome: "Namaste, BolKe mein swagat hai. Mic dabakar bolen."
```

Repeat for: `kn.yaml`, `ta.yaml`, `te.yaml`, `bn.yaml`, `mr.yaml`
(translate each string to the respective language).

### PHASE 0 SMOKE TEST ✓
```bash
cd bolke && pnpm install
# Expected: workspace resolves, no errors
ls packages/shared-types/src/claude.ts
ls packages/prompts/src/system_v1.md
ls packages/i18n/strings/hi.yaml
# All 3 must exist
```

---

## ══════════════════════════════════════
## PHASE 1 — INFRASTRUCTURE
## Source: architecture.md §3.6, tech_stack.md §6 & §8, Folder_Structure.md §6
## ══════════════════════════════════════

### WHAT THE DOCS SAY
architecture.md §3.6: Supabase = Postgres + Auth + Object Storage.
tech_stack.md §8.1: Hetzner CX22 VPS for n8n at €5/mo.
tech_stack.md §8.3: Doppler for all secrets — nothing in .env files in production.

### STEP 1.1 — Supabase project setup

Create a new Supabase project (region: Singapore — closest to India with full support).

Run migrations from `infra/supabase/migrations/` in order:

**20260101_init.sql:**
```sql
-- Users — phone stored as hash only (architecture.md §5.2)
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash   TEXT UNIQUE NOT NULL,
  language_pref CHAR(2) DEFAULT 'hi',
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Sessions
CREATE TABLE sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  jwt_id     TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Query logs — NO PII stored here (architecture.md §5.1)
CREATE TABLE query_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  intent       TEXT,
  language     CHAR(2),
  latency_ms   INTEGER,
  cost_paise   INTEGER,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Audio uploads (24h TTL enforced by scripts/ops/purge_old_audio.ts)
CREATE TABLE audio_uploads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  storage_path TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL
);

-- DigiLocker OAuth tokens — encrypted at rest
CREATE TABLE digilocker_tokens (
  user_id         UUID PRIMARY KEY REFERENCES users(id),
  encrypted_token TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL
);
```

**infra/supabase/policies/rls_policies.sql:**
```sql
-- Enable RLS on all tables
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_uploads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE digilocker_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (all access via backend only)
-- Android client has NO direct Supabase access
CREATE POLICY "service_only" ON users
  USING (auth.role() = 'service_role');
-- Repeat for all tables
```

### STEP 1.2 — Doppler secrets setup

Install Doppler CLI. Create project `bolke`, environments `dev`/`staging`/`prod`.

Add these secrets (from Model_&_API.md §13 rotation table):

```
ANTHROPIC_API_KEY         # from console.anthropic.com
GOOGLE_APPLICATION_CREDENTIALS_JSON  # GCP service account JSON
ELEVENLABS_API_KEY        # from elevenlabs.io
MSG91_AUTH_KEY            # from msg91.com
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
SUPABASE_URL              # your project URL
SUPABASE_SERVICE_KEY      # service role key (NOT anon key)
JWT_SECRET                # 64-byte random string
N8N_WEBHOOK_HMAC_SECRET   # 32-byte random string
```

**CRITICAL CHECK (architecture.md §7):**
Run `grep -r "sk-ant" apps/` after every code change.
Result must always be empty. API key never touches the Android app.

### STEP 1.3 — n8n VPS setup

Provision Hetzner CX22 (2 vCPU / 4 GB RAM / Ubuntu 24 LTS).

```bash
# On the VPS
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=bolke_admin \
  -e N8N_BASIC_AUTH_PASSWORD=$N8N_PASSWORD \
  -e WEBHOOK_URL=https://n8n.bolke.internal \
  -v n8n_data:/home/node/.n8n \
  --restart unless-stopped \
  n8nio/n8n
```

Add Cloudflare Tunnel for secure internal access (no public port exposure).

### STEP 1.4 — n8n baseline workflows

Import these 4 JSON workflow files from `workflows/n8n/`:

```
pds_ration_status.json    → webhook trigger + Karnataka PDS HTTP call + SMS node
pmjay_hospital_lookup.json→ webhook trigger + lat/lon → PMJAY API + return
digilocker_fetch.json     → webhook trigger + OAuth token refresh + DigiLocker GET
sms_confirm.json          → webhook trigger + MSG91 HTTP node
```

Each workflow webhook URL = `https://n8n.bolke.internal/webhook/<name>`.
All must validate the HMAC signature on the `X-BolKe-Signature` header
before processing (architecture.md §7: "shared HMAC secret").

### PHASE 1 SMOKE TEST ✓
```sql
-- Run in Supabase SQL editor
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
-- Must return: users, sessions, query_logs, audio_uploads, digilocker_tokens
```
```bash
# Doppler
doppler secrets --project bolke --config dev | grep ANTHROPIC
# Must show key exists (value masked)

# n8n health
curl -u bolke_admin:$N8N_PASSWORD https://n8n.bolke.internal/healthz
# Expected: {"status":"ok"}
```

---

## ══════════════════════════════════════
## PHASE 2 — BACKEND: FASTIFY GATEWAY
## Source: architecture.md §3.2, tech_stack.md §3, Model_&_API.md §7
## ══════════════════════════════════════

### WHAT THE DOCS SAY
architecture.md §3.2: Fastify, stateless, 4 endpoints.
tech_stack.md §3.3: @anthropic-ai/sdk, @google-cloud/speech, zod, pino, jose.
Model_&_API.md §7: exact request/response shapes for all endpoints.

### STEP 2.1 — Initialise backend package

```bash
cd apps/backend
pnpm init
pnpm add fastify @fastify/multipart @fastify/helmet @fastify/cors \
         @fastify/rate-limit @anthropic-ai/sdk \
         @google-cloud/speech @google-cloud/text-to-speech \
         zod pino jose postgres
pnpm add -D typescript @types/node vitest tsx
```

### STEP 2.2 — Validated env config

**apps/backend/src/config/env.ts:**
```typescript
import { z } from 'zod';

const EnvSchema = z.object({
  PORT:                    z.string().default('3000'),
  ANTHROPIC_API_KEY:       z.string().min(1),
  SUPABASE_URL:            z.string().url(),
  SUPABASE_SERVICE_KEY:    z.string().min(1),
  JWT_SECRET:              z.string().min(32),
  N8N_WEBHOOK_HMAC_SECRET: z.string().min(16),
  MSG91_AUTH_KEY:          z.string().min(1),
  NODE_ENV:                z.enum(['development','staging','production']).default('development'),
});

// Server refuses to start if any key is missing (tech_stack §8.3)
export const env = EnvSchema.parse(process.env);
```

### STEP 2.3 — Server bootstrap

**apps/backend/src/server.ts:**
```typescript
import Fastify from 'fastify';
import { env } from './config/env.js';

const app = Fastify({ logger: { transport: { target: 'pino-pretty' } } });

await app.register(import('@fastify/helmet'));
await app.register(import('@fastify/cors'), { origin: false });
await app.register(import('@fastify/rate-limit'), {
  max: 60,                      // 60 requests per window (architecture §7)
  timeWindow: '1 hour',
  keyGenerator: (req) => req.headers['x-device-id'] as string ?? req.ip,
});
await app.register(import('@fastify/multipart'), { limits: { fileSize: 200 * 1024 } }); // 200 KB max

// Register route modules
await app.register(import('./routes/health.js'));
await app.register(import('./routes/auth.js'), { prefix: '/v1' });
await app.register(import('./routes/voice.js'), { prefix: '/v1' });
await app.register(import('./routes/action.js'), { prefix: '/v1' });

await app.listen({ port: Number(env.PORT), host: '0.0.0.0' });
```

### STEP 2.4 — Auth routes (OTP + JWT)

**apps/backend/src/routes/auth.ts** — implement per Model_&_API.md §7.1–7.2:

```typescript
// POST /v1/auth/otp
// Body: { phone: "+91XXXXXXXXXX" }
// → calls Supabase Auth to send OTP via MSG91
// → returns { request_id, ttl_seconds: 120 }

// POST /v1/auth/verify
// Body: { request_id, code }
// → verifies with Supabase
// → issues JWT (1h) + refresh token (30d, device-bound)
// → returns { access_token, refresh_token, expires_in: 3600 }
```

JWT payload structure:
```typescript
{ sub: userId, device_id: deviceId, iat, exp: iat + 3600 }
```

### STEP 2.5 — Health endpoint

**apps/backend/src/routes/health.ts:**
```typescript
// GET /v1/health
// Pings Claude API, STT, TTS, n8n — returns status of each
// Response shape from Model_&_API.md §7.5:
// { status, claude, stt, tts, n8n }
// Each field = "ok" | "degraded"
```

### STEP 2.6 — Auth middleware

**apps/backend/src/middleware/auth.ts:**
```typescript
// Validates JWT on every protected route
// Extracts userId + deviceId from token
// Rejects if: expired, wrong device_id, or tampered
// Source: architecture.md §7 — "device-bound refresh token"
```

### PHASE 2 SMOKE TEST ✓
```bash
cd apps/backend && doppler run -- npx tsx src/server.ts

curl http://localhost:3000/v1/health
# Expected: {"status":"ok","claude":"ok",...}

curl -X POST http://localhost:3000/v1/auth/otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210"}'
# Expected: 200 {"request_id":"...","ttl_seconds":120}

curl -X POST http://localhost:3000/v1/voice \
  # No auth header
# Expected: 401 Unauthorized
```

---

## ══════════════════════════════════════
## PHASE 3 — AI PIPELINE: STT → CLAUDE → TTS
## Source: Model_&_API.md §2–5, architecture.md §4
## ══════════════════════════════════════

### WHAT THE DOCS SAY
architecture.md §4: the 11-step request lifecycle with exact latency budgets.
Model_&_API.md §2: Claude Haiku 4.5, max_tokens=300, prompt caching required.
Model_&_API.md §3–4: Google STT config and TTS voice map.

### STEP 3.1 — Google STT service

**apps/backend/src/services/stt/googleStt.ts:**
```typescript
import speech from '@google-cloud/speech';

const client = new speech.SpeechClient();

// Config sourced exactly from Model_&_API.md §3.1
export async function transcribeAudio(audioBuffer: Buffer): Promise<{
  transcript: string;
  language: string;
}> {
  const [response] = await client.recognize({
    config: {
      encoding: 'OGG_OPUS',
      sampleRateHertz: 16000,
      languageCodes: ['hi-IN','kn-IN','ta-IN','te-IN','bn-IN','mr-IN','en-IN'],
      model: 'latest_long',
      enableAutomaticPunctuation: true,
    },
    audio: { content: audioBuffer.toString('base64') },
  });

  const transcript = response.results?.[0]?.alternatives?.[0]?.transcript ?? '';
  const language = response.results?.[0]?.languageCode?.split('-')[0] ?? 'hi';
  return { transcript, language };
}
```

### STEP 3.2 — Claude reasoning service

**apps/backend/src/services/claude/client.ts:**
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { ClaudeReplySchema, type ClaudeReply } from '@bolke/shared-types';
import { env } from '../../config/env.js';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// Load system prompt from packages/prompts/src/system_v1.md
const SYSTEM_PROMPT = readFileSync(
  new URL('../../../../packages/prompts/src/system_v1.md', import.meta.url),
  'utf8'
);

// Primary model — Model_&_API.md §2.1
const PRIMARY_MODEL   = 'claude-haiku-4-5-20251001';
const ESCALATION_MODEL = 'claude-sonnet-4-6';

export async function getReply(transcript: string): Promise<ClaudeReply> {
  return callClaude(transcript, PRIMARY_MODEL, 0);
}

async function callClaude(
  transcript: string,
  model: string,
  attempt: number
): Promise<ClaudeReply> {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 300,        // HARD CAP — Model_&_API.md §2.8 — never increase
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },  // 90% cost saving — §2.3
      }
    ],
    messages: [{ role: 'user', content: transcript }],
  });

  const raw = response.content[0]?.type === 'text'
    ? response.content[0].text : '';

  // Strip markdown fences if present
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();

  const parsed = ClaudeReplySchema.safeParse(JSON.parse(cleaned));

  if (parsed.success) return parsed.data;

  // Fallback chain — Model_&_API.md §2.6
  if (attempt === 0) return callClaude(transcript, PRIMARY_MODEL, 1);
  if (attempt === 1) return callClaude(transcript, ESCALATION_MODEL, 2);

  // Final fallback — return safe unknown intent
  return {
    reply: 'Maaf kijiye, abhi samajh nahi aaya. Dobara bolen.',
    intent: 'unknown', icon: 'unknown',
    language: 'hi', action_url: null, confidence: 0,
  };
}
```

### STEP 3.3 — Google TTS service

**apps/backend/src/services/tts/googleTts.ts:**
```typescript
import tts from '@google-cloud/text-to-speech';

const client = new tts.TextToSpeechClient();

// Voice map — sourced from Model_&_API.md §4.1
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
      speakingRate: 0.95,      // 5% slower for comprehension — design.md §5.1
    },
  });
  return Buffer.from(response.audioContent as Uint8Array);
}
```

### STEP 3.4 — The /v1/voice route

**apps/backend/src/routes/voice.ts** — orchestrates the full 11-step pipeline:

```typescript
// POST /v1/voice
// 1. Verify JWT (middleware)
// 2. Extract audio blob from multipart (max 200 KB)
// 3. Upload to Supabase Storage (with 24h expires_at)
// 4. Call googleStt.transcribeAudio(buffer)
// 5. Call claude.getReply(transcript)
// 6. If action needed, fire n8n webhook ASYNC (do not await)
// 7. Call googleTts.synthesise(reply.reply, reply.language)
// 8. Upload MP3 to Supabase CDN path
// 9. Write row to query_logs (no PII)
// 10. Return full VoiceResponse (Model_&_API.md §7.3)

// Response shape:
// {
//   request_id, transcript, language,
//   reply_text, reply_audio_url,
//   intent, icon,
//   action: { type, label, url } | null,
//   latency_ms
// }
```

Latency target: total < 3,000ms on 3G (architecture.md §4).
Instrument every step with `performance.now()` and log to query_logs.

### PHASE 3 SMOKE TEST ✓
```bash
# Record 5 seconds: "mera ration card kab aayega" (Hindi)
# Save as test.opus

curl -X POST http://localhost:3000/v1/voice \
  -H "Authorization: Bearer $VALID_JWT" \
  -F "audio=@test.opus" \
  -F "device_id=test-device-001"

# Expected response:
# { language: "hi", intent: "ration", icon: "ration",
#   reply_text: "<Hindi sentence>",
#   reply_audio_url: "<url>", latency_ms: <2000–3000> }

# Verify:
# 1. latency_ms < 3000
# 2. language = "hi"
# 3. reply_text is one sentence
# 4. intent = "ration"
```

---

## ══════════════════════════════════════
## PHASE 4 — n8n WORKFLOWS
## Source: Model_&_API.md §8–9, architecture.md §3.5
## ══════════════════════════════════════

### WHAT THE DOCS SAY
architecture.md §3.5: n8n orchestrates ALL government API calls.
The Android client and Claude NEVER call government APIs directly.
Model_&_API.md §8: exact webhook contracts for each workflow.

### STEP 4.1 — Backend n8n webhook client

**apps/backend/src/services/n8n/webhookClient.ts:**
```typescript
import crypto from 'crypto';
import { env } from '../../config/env.js';

const N8N_BASE = 'https://n8n.bolke.internal/webhook';

// Sign every request with HMAC-SHA256 (architecture.md §7)
function sign(body: string): string {
  return crypto
    .createHmac('sha256', env.N8N_WEBHOOK_HMAC_SECRET)
    .update(body)
    .digest('hex');
}

export async function triggerWorkflow(
  name: string,
  payload: Record<string, unknown>
): Promise<void> {
  const body = JSON.stringify(payload);
  // Fire and forget — NEVER await this in the voice route (architecture §4 step 7)
  fetch(`${N8N_BASE}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-BolKe-Signature': sign(body),
    },
    body,
  }).catch((err) => console.error(`n8n ${name} failed:`, err));
}
```

### STEP 4.2 — n8n workflow: pds_ration_status

In n8n UI, create workflow with these nodes:

```
[Webhook trigger] → [HMAC Validate (Code node)] → [HTTP Request: Karnataka PDS API]
→ [Set: format reply] → [HTTP Request: sms_confirm webhook] → [Respond to Webhook]
```

PDS API endpoint (Karnataka MVP):
```
GET https://ahara.kar.nic.in/rcms/api/card_status?rc_number={{rc_number}}
```

On success → trigger `sms_confirm` with template_id: `ration_status`.
Export completed workflow to `workflows/n8n/pds_ration_status.json`.

### STEP 4.3 — n8n workflow: pmjay_hospital_lookup

```
[Webhook] → [HMAC Validate] → [HTTP: PMJAY hospital list API]
→ [Sort by distance from lat/lon] → [Return top 3 hospitals] → [Respond]
```

PMJAY endpoint:
```
GET https://api.pmjay.gov.in/v1/hospitals?lat={{lat}}&lon={{lon}}&radius={{radius_km}}
```

Export to `workflows/n8n/pmjay_hospital_lookup.json`.

### STEP 4.4 — n8n workflow: sms_confirm (MSG91)

```
[Webhook] → [HMAC Validate] → [HTTP: MSG91 send SMS]
→ [Log to Supabase: query_logs] → [Respond]
```

MSG91 API:
```
POST https://api.msg91.com/api/v5/flow/
{
  "template_id": "{{template_id}}",
  "recipients": [{ "mobiles": "{{phone}}", ...params }]
}
```

Export to `workflows/n8n/sms_confirm.json`.

### PHASE 4 SMOKE TEST ✓
```bash
# Test HMAC validation
curl -X POST https://n8n.bolke.internal/webhook/pds_ration_status \
  -H "Content-Type: application/json" \
  -H "X-BolKe-Signature: WRONG_SIGNATURE" \
  -d '{"user_id":"u_test","state_code":"KA"}'
# Expected: 401

# Test valid call
BODY='{"user_id":"u_test","state_code":"KA"}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$N8N_WEBHOOK_HMAC_SECRET" -hex | cut -d' ' -f2)
curl -X POST https://n8n.bolke.internal/webhook/pds_ration_status \
  -H "X-BolKe-Signature: $SIG" \
  -H "Content-Type: application/json" \
  -d "$BODY"
# Expected: 200 { success: true, data: {...} }
```

---

## ══════════════════════════════════════
## PHASE 5 — ANDROID: CORE UI + VOICE + PLAYBACK
## Source: design.md §2–5, tech_stack.md §2, PRD.md §6.1–6.4
## ══════════════════════════════════════

### WHAT THE DOCS SAY
design.md §2.4: mic button = 240dp, min touch = 64dp, min font = 24sp.
tech_stack.md §2: Kotlin 2.0, Compose 1.7, Koin, Room, Ktor, Vosk.
PRD §6.1 FR-1.1–1.5: mic button rules, hold-to-talk, 15s max.

### STEP 5.1 — Android project setup

Create Android project at `apps/android/` with:
```
applicationId = "com.bolke.app"
minSdk = 24        # Android 7.0 (PRD §7 NFR)
targetSdk = 35
compileSdk = 35
```

**apps/android/app/build.gradle.kts — key dependencies:**
```kotlin
implementation("io.insert-koin:koin-android:3.5.6")
implementation("io.insert-koin:koin-androidx-compose:3.5.6")
implementation("io.ktor:ktor-client-android:2.3.12")
implementation("com.airbnb.android:lottie-compose:6.4.0")
implementation("androidx.room:room-runtime:2.6.1")
implementation("androidx.room:room-ktx:2.6.1")
implementation("androidx.media3:media3-exoplayer:1.3.1")
implementation("net.sourceforge.vosk:vosk-android:0.3.47")
implementation("io.coil-kt:coil-compose:2.6.0")
```

### STEP 5.2 — Theme setup

**apps/android/app/src/main/java/com/bolke/app/ui/theme/Color.kt:**
```kotlin
// Sourced exactly from design.md §2.1
val Saffron      = Color(0xFFFF7A29)  // Primary — mic button, CTA
val DeepGreen    = Color(0xFF0E8C5B)  // Success, confirmation
val Cream        = Color(0xFFFFF8EE)  // Background
val SurfaceWhite = Color(0xFFFFFFFF)  // Cards
val Charcoal     = Color(0xFF1F1F1F)  // Text (minimal use)
val ErrorRed     = Color(0xFFD9342B)  // Failures
val StoneGray    = Color(0xFF9C9384)  // Disabled
```

**Type.kt — enforce minimum sizes from design.md §2.2:**
```kotlin
val BolKeTypography = Typography(
  bodyLarge  = TextStyle(fontSize = 24.sp),  // minimum body
  headlineLarge = TextStyle(fontSize = 32.sp, fontWeight = FontWeight.Bold),
  // Never below 18sp anywhere — design.md §2.2 hard rule
)
```

### STEP 5.3 — Mic button component

**apps/android/app/.../ui/components/MicButton.kt:**
```kotlin
@Composable
fun MicButton(
  isListening: Boolean,
  onPressStart: () -> Unit,
  onPressEnd: () -> Unit,
) {
  // Size: 240dp on home screen (design.md §4.1 — "≥40% of screen")
  // Min touch target: 64dp (design.md §2.4)
  // Animation: pulsing Lottie when listening (design.md §4.2)
  // Colour: Saffron #FF7A29 (design.md §2.1)
  // Interaction: pointerInput for press-and-hold (PRD §6.1 FR-1.2)

  val size = if (isListening) 320.dp else 240.dp
  val animatedSize by animateDpAsState(targetValue = size,
    animationSpec = tween(250))  // design.md §6: 250–400ms

  Box(
    modifier = Modifier
      .size(animatedSize)
      .clip(CircleShape)
      .background(Saffron)
      .pointerInput(Unit) {
        detectTapGestures(
          onPress = {
            onPressStart()
            tryAwaitRelease()
            onPressEnd()
          }
        )
      },
    contentAlignment = Alignment.Center
  ) {
    if (isListening) {
      LottieAnimation(  // Lottie from res/raw/mic_pulse.json
        composition = ...,
        iterations = LottieConstants.IterateForever,
        modifier = Modifier.size(120.dp)
      )
    } else {
      Icon(painterResource(R.drawable.ic_mic), contentDescription = "Mic",
        tint = Color.White, modifier = Modifier.size(80.dp))
    }
  }
}
```

### STEP 5.4 — Audio recorder

**apps/android/app/.../audio/AudioRecorder.kt:**
```kotlin
class AudioRecorder {
  private var recorder: MediaRecorder? = null
  private val MAX_DURATION_MS = 15_000L  // PRD §6.1 FR-1.5 — hard cap

  fun start(outputFile: File) { /* configure + start MediaRecorder */ }
  fun stop(): File { /* stop + return opus file */ }
  // Auto-stop after MAX_DURATION_MS using Handler.postDelayed
}
```

**apps/android/app/.../audio/TtsPlayer.kt** using ExoPlayer Media3:
```kotlin
class TtsPlayer {
  // Loads and plays the reply_audio_url from /v1/voice response
  // Starts playing IMMEDIATELY on Reply screen (design.md §4.3)
  // No tap required — voice plays the moment screen appears
}
```

### STEP 5.5 — Room local cache

```kotlin
// Cache last 50 query→reply pairs for 24h (PRD §6.6 FR-6.2)
@Entity(tableName = "query_cache")
data class QueryCacheEntity(
  @PrimaryKey val id: String,
  val transcript: String,
  val replyText: String,
  val replyAudioPath: String,   // local file path
  val intent: String,
  val icon: String,
  val createdAt: Long,
  val expiresAt: Long,          // createdAt + 86_400_000 (24h)
)
```

### PHASE 5 SMOKE TEST ✓
```
Run on a physical 1 GB RAM Android 7.0 device.
- Open app → Cream background visible
- Mic button = 240dp, Saffron colour
- Press and hold → button expands to 320dp, Lottie pulse plays
- Release after 5 sec → recording file saved (check logcat)
- Recording auto-stops at 15 seconds (test by holding 16+ sec)
- No ANR dialog during entire test
```

---

## ══════════════════════════════════════
## PHASE 6 — ANDROID: ALL 9 SCREENS + OFFLINE
## Source: design.md §3–9, PRD §6.6, tech_stack.md §2.7
## ══════════════════════════════════════

### WHAT THE DOCS SAY
design.md §3: exactly 9 screens. No menus, no tabs, no drawers.
design.md §9: every error state must have a voice prompt + icon.
tech_stack.md §2.7: Vosk offline STT + WorkManager retry queue.

### STEP 6.1 — Screen 1: Splash

```kotlin
// SplashScreen.kt
// Shows BolKe logo on Cream background
// Auto-navigates to: auth (new user) or home (returning user with valid token)
// Duration: ≤1 second (not a loading screen — just brand flash)
```

### STEP 6.2 — Screen 2: Phone OTP

```kotlin
// AuthScreen.kt
// Voice prompt plays: "Apna phone number bolen ya likhen" (i18n string onboarding_welcome)
// Single full-screen phone input, numeric keyboard forced
// OTP arrives → TtsPlayer reads it: "Aapka code hai X-X-X-X"
// Touch target for number buttons: minimum 64dp (design.md §2.4)
```

### STEP 6.3 — Screen 3: Home

Already implemented in Phase 5 (MicButton + Home layout).
Add recent queries row at bottom (last 2, shown as icons from Room cache).

### STEP 6.4 — Screens 4 & 5: Listening + Thinking

```kotlin
// ListeningScreen.kt
// - Full-screen with recording mic animation (320dp Lottie)
// - Waveform amplitude animation tied to audio level
// - Voice: "Sun raha hoon..." (first session only)

// ThinkingScreen.kt
// - Spinner animation + "Ek pal..." text (24sp min)
// - Appears while STT+Claude+TTS pipeline runs (~2.3 sec)
```

### STEP 6.5 — Screen 6: Reply

```kotlin
// ReplyScreen.kt
// Layout per design.md §4.3:
// - Large icon: 160dp Lottie matching intent
// - TtsPlayer.play() called IMMEDIATELY in LaunchedEffect (no tap)
// - ONE primary action button (if action != null): 64dp height min
// - Small mic button (120dp) at bottom for follow-up
```

**LottieIcon.kt — map intent → Lottie file:**
```kotlin
fun intentToLottie(intent: String) = when(intent) {
  "hospital"          -> R.raw.icon_hospital
  "ration"            -> R.raw.icon_ration
  "bank"              -> R.raw.icon_bank
  "transport"         -> R.raw.icon_transport
  "pension"           -> R.raw.icon_pension
  "document"          -> R.raw.icon_document
  else                -> R.raw.icon_unknown
}
// All Lottie files must be ≤50 KB each (design.md §2.3)
```

### STEP 6.6 — Screens 7 & 8: Action Confirm + Failure

```kotlin
// ActionConfirmScreen.kt
// "Aapka kaam ho gaya" voice + green check Lottie
// Shows SMS preview text: "SMS: <message>"
// Returns to home automatically after 3 seconds

// FailureScreen.kt (design.md §9)
// Shows error icon + plays failure voice from i18n
// Large "Dobara bolen" button (retry mic)
// Always shows helpline number as fallback
```

### STEP 6.7 — Screen 9: Settings

```kotlin
// SettingsScreen.kt
// Voice-first: each option read aloud when focused (TalkBack)
// Only options needed for MVP:
// - Language (auto / manual select)
// - Delete my data
// - About / version
// NO complex menus — one flat list with 64dp touch targets
```

### STEP 6.8 — Offline mode (Vosk)

**VoskFallbackStt.kt:**
```kotlin
class VoskFallbackStt(context: Context) {
  // Load vosk-model-small-hi-0.22 from assets (~50 MB)
  // Activated when: no network for >2 seconds
  // Quality disclaimer: shows "saved offline" icon
  // Queues result to WorkManager for server replay when online
}
```

**WorkManager retry job:**
```kotlin
class RetryVoiceQueryWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(...) {
  // Triggered when network returns
  // Replays queued offline transcripts to /v1/voice
  // Constraints: RequiredNetworkType.CONNECTED
}
```

### PHASE 6 SMOKE TEST ✓
```
Navigate all 9 screens manually and verify:
□ Splash → Auth → Home → Listening → Thinking → Reply → Confirm → Home
□ Failure path: cut network → Failure screen shows + voice prompt plays
□ Enable "Remove animations" → Lottie stops → no crash
□ Enable TalkBack → all screens navigable by voice
□ Enable airplane mode → Vosk activates → "saved offline" icon shown
□ Re-enable network → offline query replays automatically
```

---

## ══════════════════════════════════════
## PHASE 7 — INTEGRATION: ALL 5 MVP FLOWS
## Source: PRD.md §5, Model_&_API.md §7–8, design.md §4
## ══════════════════════════════════════

### WHAT THE DOCS SAY
PRD §5: 5 use cases, each completable in ≤3 taps.
architecture.md §4: n8n actions fire async, never block voice reply.
PRD §4.2: bank balance is read-only — no transactions.

### STEP 7.1 — Wire the Ktor API client (Android)

**apps/android/app/.../data/api/BolKeApi.kt:**
```kotlin
interface BolKeApi {
  // POST /v1/auth/otp     → OtpResponse
  // POST /v1/auth/verify  → AuthResponse
  // POST /v1/voice        → VoiceResponse (multipart)
  // POST /v1/action/:intent → ActionResponse
  // GET  /v1/health       → HealthResponse
}
```

Use Ktor with OkHttp engine for cert pinning:
```kotlin
// OkHttp cert pinning (architecture.md §7)
CertificatePinner.Builder()
  .add("api.bolke.app", "sha256/...YOUR_CERT_HASH...")
  .build()
```

### STEP 7.2 — Flow 1: Ration card status

End-to-end wire:
```
MicButton (hold) → AudioRecorder.start()
                → AudioRecorder.stop()
                → VoiceRepository.submitQuery(audio)
                → POST /v1/voice
                → ReplyScreen (icon=ration, voice reply)
                → ActionButton (tel:1967 helpline)
                [async] → n8n pds_ration_status → SMS
```

Verify the async gate: ReplyScreen must appear
BEFORE n8n completes. Check with network throttle.

### STEP 7.3 — Flow 2: Nearest hospital (GPS)

```
VoiceQuery("hospital") → intent=hospital
→ ActionButton triggers: triggerWorkflow("pmjay_hospital_lookup",
    { lat: currentLat, lon: currentLon, radius_km: 5 })
→ Opens Google Maps with voice-guided navigation
```

Permissions needed: `ACCESS_FINE_LOCATION`.
Fallback if GPS denied: ask user to speak their city name.

### STEP 7.4 — Flow 3: Scheme eligibility (multi-turn)

This is the only 2-turn flow (PRD §4.2: max 2 turns).
```
Turn 1: "Mujhe pension chahiye"
       → Claude detects scheme_eligibility intent
       → Returns clarifying question as reply
       → ReplyScreen shows + mic stays active for Turn 2

Turn 2: User speaks age/gender/income answer
       → Second POST /v1/voice with context
       → Claude returns matching scheme + helpline
```

Pass conversation context in voice request:
```kotlin
// Include previous turn as context (max 2 turns per PRD §4.2)
val context = if (previousTurn != null) "Context: ${previousTurn.transcript}" else ""
```

### STEP 7.5 — Flow 4: DigiLocker Aadhaar fetch

```
VoiceQuery("Aadhaar dikhao") → intent=document
→ ActionButton → triggerWorkflow("digilocker_fetch",
    { user_id, doc_type: "aadhaar_masked" })
→ [n8n handles OAuth + fetch]
→ SMS with masked Aadhaar XXXX-XXXX-1234
→ Claude never sees the Aadhaar number (architecture §5.2)
```

### STEP 7.6 — Flow 5: Bank balance (read-only)

```
VoiceQuery("balance batao") → intent=bank
→ Backend calls Account Aggregator API (read-only consent)
→ Returns balance as spoken rupee amount
→ Balance NEVER written to query_logs (architecture §5.2)
→ No transaction details shown (PRD §4.2)
```

### PHASE 7 SMOKE TEST ✓
```
Test each flow on a physical 3G-throttled device:
□ Flow 1: Hindi ration query → reply < 3 sec → SMS arrives < 60 sec
□ Flow 2: Kannada hospital → GPS used → hospital shown with icon
□ Flow 3: Hindi pension → 2 turns → scheme returned (not invented)
□ Flow 4: DigiLocker → Aadhaar masked → full number never shown
□ Flow 5: Balance → spoken in user's language → not logged

For each flow, verify tap count ≤ 3 (PRD §4.1 goal 1)
```

---

## ══════════════════════════════════════
## PHASE 8 — HARDENING
## Source: architecture.md §6–11, PRD.md §7, tech_stack.md §8
## ══════════════════════════════════════

### WHAT THE DOCS SAY
PRD §7 NFR: 99.5% uptime, P95 ≤3s, ≤₹0.50/query.
architecture.md §6: every failure mode must have a defined mitigation.
architecture.md §10: Pino+Grafana+Prometheus+Sentry+OpenTelemetry.

### STEP 8.1 — Resilience: implement all 7 failure modes

From architecture.md §6 — code each mitigation explicitly:

```typescript
// 1. STT timeout → retry once → Vosk fallback
// In googleStt.ts: wrap with AbortSignal timeout 2000ms
// On timeout: emit 'stt_fallback' event to Android client

// 2. Claude 5xx → exponential backoff → static reply
// In claude/client.ts: catch 5xx, retry after 1s then 2s
// After 2 retries: return hardcoded safe reply

// 3. Claude invalid JSON → retry with reminder → Sonnet escalation
// Already implemented in Phase 3 Step 3.2 callClaude()

// 4. TTS fails → cached "please wait" audio
// In googleTts.ts: on error, return Buffer of static fallback MP3
// Store fallback MP3 in apps/backend/src/assets/fallback_hi.mp3

// 5. n8n down → queue + SMS apology
// In webhookClient.ts: on connection refused, log to bullmq queue
// BullMQ worker retries every 5 min for up to 2 hours

// 6. Network drop (Android) → Room cache replay
// In VoiceRepository.kt: on IOException, load latest Room cache entry

// 7. Gateway region down → Cloud Run load balancer (automatic)
```

### STEP 8.2 — Observability stack

```typescript
// pino logger (already in server.ts)
// Add OpenTelemetry spans:
import { trace } from '@opentelemetry/api';
const tracer = trace.getTracer('bolke-gateway');

// Wrap each service call in a span:
const sttSpan = tracer.startSpan('stt.transcribe');
// ... call STT ...
sttSpan.end();
```

**Grafana dashboard panels (from architecture.md §10):**
- P50 / P95 voice→reply latency
- Intent distribution pie chart
- Cost per query (₹) — calculated from token counts
- Error rate by component (STT / Claude / TTS / n8n)
- Daily Anthropic spend vs $50 cap

### STEP 8.3 — GitHub Actions CI/CD

**.github/workflows/backend-ci.yml:**
```yaml
name: Backend CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: pnpm install
      - run: pnpm --filter backend test
      - name: Security — check no API key in source
        run: |
          grep -r "sk-ant" apps/ && exit 1 || echo "Clean ✓"
          grep -r "ANTHROPIC_API_KEY" apps/android/ && exit 1 || echo "Clean ✓"
```

**.github/workflows/backend-deploy.yml:**
```yaml
name: Deploy to Cloud Run
on:
  push:
    branches: [main]
jobs:
  deploy:
    steps:
      - uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: bolke-gateway
          region: asia-south1   # Mumbai
          image: gcr.io/$PROJECT_ID/bolke-backend:$SHA
```

**.github/workflows/android-release.yml:**
```yaml
name: Android Release
on:
  push:
    tags: ['v*']
jobs:
  build:
    steps:
      - run: ./gradlew bundleRelease
      - name: APK size check
        run: |
          SIZE=$(stat -c%s app/build/outputs/bundle/release/app-release.aab)
          [ $SIZE -lt 26214400 ] && echo "Size OK ✓" || (echo "APK too large!" && exit 1)
          # 25 MB = 26,214,400 bytes (PRD §6.6 FR-6.3)
```

### STEP 8.4 — Final production checklist

```
SECURITY
□ TLS 1.3 enforced on Cloud Run (automatic)
□ Cert pinning active in Android OkHttp
□ All secrets in Doppler — zero .env files in prod
□ Claude API key confirmed absent from APK (CI check passes)
□ Raw Aadhaar never stored (verified in Supabase RLS policies)
□ Audio TTL purge script running on schedule

PERFORMANCE
□ P95 latency < 3,000 ms verified over 100 real queries on 3G
□ APK size ≤ 25 MB confirmed by CI gate
□ 1 GB RAM device — no ANR or OOM over 30 consecutive queries
□ Prompt caching active (verify cache_read_input_tokens > 0)

COST
□ Cost per query ≤ ₹0.50 confirmed over 1,000 test queries
□ Daily Anthropic spend cap $50 alert configured
□ max_tokens: 300 hardcoded in claude/client.ts — never changed

OBSERVABILITY
□ Sentry DSN configured for Android + Node
□ Grafana dashboard deployed with 5 key panels
□ /v1/health returns status of all 4 dependencies
□ OpenTelemetry traces flowing from Gateway → Claude → n8n

CONTENT & LANGUAGE
□ All 6 languages tested with real voice samples
□ Every Claude reply uses "aap" form — verified in golden tests
□ No invented scheme names in any test reply
□ TTS comprehension user test score ≥ 4.0/5.0

COMPLIANCE
□ No GPL libraries anywhere (license-checker CI step passes)
□ DPDP Act: consent flow exists, delete-account endpoint works
□ DLT-compliant SMS template IDs registered with MSG91
```

### PHASE 8 SMOKE TEST = PRODUCTION LAUNCH GATE ✓
```
All 74 tests in E2E_TESTING_MASTER_PROMPT.md must pass.
All items in the SECURITY + PERFORMANCE + COST checklist above must be ✓.
Only then: merge to main → CI deploys to production.
```

---

## PHASE COMPLETION TRACKER

Copy this into your project management tool (Linear/Jira):

```
PHASE 0 — Foundation & Repo Setup          □ Not Started
PHASE 1 — Infrastructure                   □ Not Started
PHASE 2 — Backend: Gateway Skeleton        □ Not Started
PHASE 3 — AI Pipeline: STT→Claude→TTS      □ Not Started
PHASE 4 — n8n Workflows                    □ Not Started
PHASE 5 — Android: Core UI + Voice         □ Not Started
PHASE 6 — Android: All 9 Screens + Offline □ Not Started
PHASE 7 — Integration: All 5 MVP Flows     □ Not Started
PHASE 8 — Hardening                        □ Not Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUCTION LAUNCH                          □ Blocked until Phase 8 ✓
```

---

## ESTIMATED TIMELINE (2-engineer team)

| Phase | Effort | Calendar days |
|-------|--------|---------------|
| 0 — Foundation | 0.5 dev-days | Day 1 |
| 1 — Infrastructure | 1.5 dev-days | Day 2–3 |
| 2 — Backend skeleton | 2 dev-days | Day 4–5 |
| 3 — AI pipeline | 2 dev-days | Day 6–7 |
| 4 — n8n workflows | 1.5 dev-days | Day 8–9 |
| 5 — Android core | 3 dev-days | Day 10–12 |
| 6 — All 9 screens | 3 dev-days | Day 13–15 |
| 7 — Integration | 2 dev-days | Day 16–17 |
| 8 — Hardening | 2 dev-days | Day 18–19 |
| **Total** | **~17.5 dev-days** | **~3.5 weeks** |

---IMPLEMENTATION PROMPT END---

---

## QUICK COMMAND REFERENCE

```bash
# Start everything locally
cd bolke
doppler run -- npx tsx apps/backend/src/server.ts   # Backend on :3000
# Android: run on device via Android Studio

# Run all backend tests
pnpm --filter backend test

# Check no API key in source (run before every commit)
grep -r "sk-ant" apps/ && echo "FAIL" || echo "CLEAN ✓"

# Validate Supabase schema
pnpm --filter backend tsx scripts/ops/validate_schema.ts

# Trigger a test voice query
curl -X POST http://localhost:3000/v1/voice \
  -H "Authorization: Bearer $TEST_JWT" \
  -F "audio=@scripts/dev/test_hindi_ration.opus"

# Check cost of last 1000 queries
pnpm --filter backend tsx scripts/analytics/cost_report.ts
```
