# BolKe — Models & API Reference

**Version:** 1.0
**Last Updated:** May 2026

This document is the definitive reference for **every external model and API** that BolKe depends on, plus the **internal API contract** between the Android client and the backend gateway.

---

## 1. Models — At a Glance

| Provider | Model | Purpose | Cost (May 2026) | Latency target |
|----------|-------|---------|-----------------|----------------|
| Anthropic | `claude-haiku-4-5-20251001` | Reasoning + intent + reply | $1 in / $5 out per MTok | <800 ms |
| Anthropic | `claude-sonnet-4-6` | Escalation for ambiguous queries | $3 in / $15 out per MTok | <1500 ms |
| Google Cloud | Speech-to-Text v2 (`latest_long`) | Voice → text | $0.024/min | <800 ms |
| Google Cloud | Text-to-Speech (Wavenet) | Text → voice | $16 / 1M chars | <500 ms |
| ElevenLabs | Multilingual v2 | Premium dialect TTS | ~$22/mo Creator tier | <800 ms |
| Vosk (on-device) | `vosk-model-small-hi-0.22` | Offline STT fallback | Free, ~50 MB | <2000 ms |

---

## 2. Claude API — Primary Reasoning Model

### 2.1 Model selection
- **Primary:** `claude-haiku-4-5-20251001` — chosen for speed + cost on every voice query.
- **Escalation:** `claude-sonnet-4-6` — used only if Haiku returns confidence below threshold or invalid JSON twice in a row. Expected to handle <5% of traffic.

### 2.2 System Prompt (v1, MVP)

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
  "icon": "one of the allowed icons",
  "language": "ISO code: hi, kn, ta, te, bn, mr, en",
  "action_url": "string or null — only if intent requires backend action",
  "confidence": "number 0.0–1.0"
}
```

### 2.3 Why prompt caching matters
The system prompt above is ~250 tokens and identical on every call. Anthropic's prompt caching gives a **90% discount on cached input tokens**, dropping the per-query Claude cost from ~$0.0005 to ~$0.0001 — roughly **₹0.008 per query**.

Cache breakpoint placement:
- Cache: full system prompt + few-shot examples (~700 tokens).
- Uncached: only the user transcript (~30–80 tokens).

### 2.4 Request shape

```http
POST https://api.anthropic.com/v1/messages
Authorization: Bearer $ANTHROPIC_API_KEY
anthropic-version: 2023-06-01
Content-Type: application/json
```

```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 300,
  "system": [
    {
      "type": "text",
      "text": "<full system prompt>",
      "cache_control": { "type": "ephemeral" }
    }
  ],
  "messages": [
    { "role": "user", "content": "<transcribed voice text>" }
  ]
}
```

### 2.5 Expected response

```json
{
  "id": "msg_01...",
  "model": "claude-haiku-4-5-20251001",
  "content": [
    {
      "type": "text",
      "text": "{\"reply\":\"Aapka ration card 5 din mein aayega.\",\"intent\":\"ration\",\"icon\":\"ration\",\"language\":\"hi\",\"action_url\":\"/v1/action/ration_status\",\"confidence\":0.92}"
    }
  ],
  "usage": {
    "input_tokens": 18,
    "cache_read_input_tokens": 712,
    "output_tokens": 64
  }
}
```

### 2.6 Validation
Backend parses `content[0].text` and runs it through this zod schema:

```ts
const ClaudeReplySchema = z.object({
  reply: z.string().min(1).max(200),
  intent: z.enum(["ration","hospital","bank","transport",
                  "pension","document","scheme_eligibility","unknown"]),
  icon: z.enum(["hospital","ration","bank","transport",
                "pension","document","phone","unknown"]),
  language: z.enum(["hi","kn","ta","te","bn","mr","en"]),
  action_url: z.string().nullable(),
  confidence: z.number().min(0).max(1)
});
```

If validation fails: retry once with a "Reply MUST be valid JSON only" reminder; if still failing, escalate to Sonnet 4.6; if that fails, return `intent: "unknown"` with a safe fallback reply.

### 2.7 Error handling

| HTTP code | Meaning | Action |
|-----------|---------|--------|
| 429 | Rate limit | Exponential backoff, max 2 retries |
| 500/503 | Anthropic outage | Fall back to static reply: "Aapka kaam shuru ho gaya, SMS aayega" |
| 400 | Bad request | Log + alert, never user-facing |
| 401 | Auth | Page on-call immediately |

### 2.8 Cost guardrails
- Hard `max_tokens: 300` cap per call.
- Per-device rate limit: 60 queries/hour.
- Daily Anthropic spend cap: $50/day in MVP (alert at 80%).

---

## 3. Google Cloud Speech-to-Text v2

### 3.1 Configuration

```json
{
  "config": {
    "auto_decoding_config": {},
    "language_codes": ["hi-IN","kn-IN","ta-IN","te-IN","bn-IN","mr-IN","en-IN"],
    "model": "latest_long",
    "features": {
      "enable_automatic_punctuation": true,
      "profanity_filter": false
    }
  },
  "uri": "gs://bolke-audio-tmp/<file>.opus"
}
```

### 3.2 Why `latest_long`
- Best accuracy on noisy rural audio.
- Supports automatic language detection across the 7 listed codes.
- Higher cost is offset by lower retry rate.

### 3.3 Pricing
- **$0.024 / minute** of audio processed.
- Free tier: 60 minutes/month.
- For 1K queries × 5 sec average = ~83 minutes ≈ **$2.00 per 1K queries**.

### 3.4 Streaming vs batch
MVP uses **batch** (audio uploaded as a whole). v1.1 will move to **StreamingRecognize** to shave ~400 ms.

---

## 4. Google Cloud Text-to-Speech

### 4.1 Voices used

| Language | Voice | Style |
|----------|-------|-------|
| Hindi | `hi-IN-Wavenet-D` | Female, warm |
| Kannada | `kn-IN-Wavenet-A` | Female |
| Tamil | `ta-IN-Wavenet-A` | Female |
| Telugu | `te-IN-Standard-A` (no Wavenet yet) | Female |
| Bengali | `bn-IN-Wavenet-A` | Female |
| Marathi | `mr-IN-Wavenet-A` | Female |

### 4.2 Audio config
- Encoding: `MP3` (smaller than LINEAR16 for upload to client).
- Sample rate: 24 kHz.
- Speaking rate: 0.95 (slightly slowed for low-literacy comprehension).

### 4.3 Pricing
- Wavenet: **$16 / 1M characters**.
- Reply length ~25 chars → ~$0.40 per 1K queries.

---

## 5. ElevenLabs — Premium Voice

### 5.1 When used
- Only for the "Saroja" branded persona at user request, or when Google TTS lacks a regional dialect (Bhojpuri, Malayalam-flavoured Tamil, etc.).

### 5.2 Endpoint
```
POST https://api.elevenlabs.io/v1/text-to-speech/<voice_id>
```

### 5.3 Body
```json
{
  "text": "<reply>",
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.55,
    "similarity_boost": 0.75
  }
}
```

---

## 6. Vosk (Offline Fallback STT)

- **Model:** `vosk-model-small-hi-0.22` (~50 MB, ships with the APK).
- Used only when network is unavailable for >2 sec.
- Quality is materially lower; reply is shown with a "saved offline" icon.
- Replays to backend once network is back.

---

## 7. Internal API — Android ↔ Backend

Base URL: `https://api.bolke.app/v1`

### 7.1 `POST /v1/auth/otp`

Request:
```json
{ "phone": "+91XXXXXXXXXX" }
```

Response:
```json
{ "request_id": "abc123", "ttl_seconds": 120 }
```

### 7.2 `POST /v1/auth/verify`

```json
{ "request_id": "abc123", "code": "423901" }
```

Response:
```json
{
  "access_token": "<jwt>",
  "refresh_token": "<token>",
  "expires_in": 3600
}
```

### 7.3 `POST /v1/voice` (the heart of the app)

Request: `multipart/form-data`
- `audio`: opus blob, max 200 KB (15 sec at 16 kHz).
- `client_lang_hint`: optional ISO code.
- `device_id`: anonymous installation UUID.

Headers:
- `Authorization: Bearer <jwt>`

Response (200):
```json
{
  "request_id": "req_01HX...",
  "transcript": "mera ration card kab aayega",
  "language": "hi",
  "reply_text": "Aapka ration card 5 din mein aayega.",
  "reply_audio_url": "https://cdn.bolke.app/tts/req_01HX....mp3",
  "intent": "ration",
  "icon": "ration",
  "action": {
    "type": "call",
    "label": "Helpline call karo",
    "url": "tel:1967"
  },
  "latency_ms": 2280
}
```

Response (4xx/5xx):
```json
{
  "error_code": "STT_FAILED",
  "user_message": "Saaf nahi suna, dobara bolen",
  "user_message_audio_url": "https://cdn.bolke.app/static/retry_hi.mp3"
}
```

### 7.4 `POST /v1/action/:intent`

Generic endpoint that proxies to the corresponding n8n workflow.

```
POST /v1/action/ration_status
{ "user_id": "u_123", "params": { "state": "KA" } }
```

Response is asynchronous:
```json
{ "queued": true, "estimated_seconds": 30, "sms_will_arrive": true }
```

The user's phone receives an SMS when complete.

### 7.5 `GET /v1/health`

```json
{ "status": "ok", "claude": "ok", "stt": "ok", "tts": "ok", "n8n": "degraded" }
```

---

## 8. n8n Workflows — Internal Webhook Contracts

Each n8n workflow exposes one webhook. Backend calls them with a shared HMAC secret.

### 8.1 `digilocker_fetch`
```
POST https://n8n.bolke.internal/webhook/digilocker_fetch
{ "user_id": "u_123", "doc_type": "aadhaar_masked" }
```

### 8.2 `pds_ration_status`
```
POST https://n8n.bolke.internal/webhook/pds_ration_status
{ "user_id": "u_123", "state_code": "KA" }
```

### 8.3 `pmjay_hospital_lookup`
```
POST https://n8n.bolke.internal/webhook/pmjay_hospital_lookup
{ "lat": 12.97, "lon": 77.59, "radius_km": 5 }
```

### 8.4 `sms_confirm`
```
POST https://n8n.bolke.internal/webhook/sms_confirm
{ "phone": "+91XXXXXXXXXX", "template_id": "ration_status", "params": {...} }
```

All webhooks return:
```json
{ "success": true, "data": {...} }
```
or
```json
{ "success": false, "error": "DIGILOCKER_TIMEOUT" }
```

---

## 9. Government APIs

| API | Auth | Rate limit | Notes |
|-----|------|-----------|-------|
| DigiLocker | OAuth 2.0 | 5/sec/app | Free for non-commercial; user consent required |
| PMJAY hospital list | API key | 100/min | Public dataset, refreshed monthly |
| PDS state portals | Varies | Varies | State-specific; Karnataka has REST, others scrape-only |
| NREGA job card | API key | 60/min | MGNREGA portal |
| UMANG | Bearer | 30/sec | Aggregator for many schemes |

These are accessed only via n8n; the Android client and Claude never touch them directly.

---

## 10. SMS Templates (DLT-compliant)

| Template ID | Variables | Use |
|-------------|-----------|-----|
| `ration_status` | `{name}`, `{days}` | Ration arrival ETA |
| `hospital_found` | `{name}`, `{distance}`, `{phone}` | Nearest hospital |
| `pension_eligible` | `{scheme_name}`, `{helpline}` | Eligibility result |
| `otp` | `{code}` | One-time password |
| `failure_generic` | `{helpline}` | Apology + helpline |

---

## 11. Cost Per Query (consolidated)

| Component | Cost (₹) |
|-----------|----------|
| Google STT (5 sec) | 0.17 |
| Claude Haiku (with caching) | 0.01 |
| Google TTS (Wavenet) | 0.03 |
| Backend hosting (amortized) | 0.02 |
| SMS (10% of queries trigger) | 0.02 |
| **Total per query** | **≈ ₹0.25** ✅ |

Comfortably under the ₹0.50 PRD target.

---

## 12. Observability — what to log per call

For every `/v1/voice` request, backend logs (PII-stripped):

```json
{
  "request_id": "req_01HX...",
  "device_id_hash": "abcd...",
  "language_detected": "hi",
  "intent": "ration",
  "stt_ms": 612,
  "claude_ms": 711,
  "tts_ms": 388,
  "total_ms": 2280,
  "claude_input_tokens": 18,
  "claude_cached_tokens": 712,
  "claude_output_tokens": 64,
  "fallback_used": false
}
```

These flow to Grafana Loki and power dashboards for latency, intent mix, and cost-per-query.

---

## 13. API Key Management

| Service | Stored in | Rotation cadence |
|---------|-----------|------------------|
| Anthropic | Doppler → Cloud Run | 90 days |
| Google Cloud | Workload Identity (no key) | n/a |
| ElevenLabs | Doppler | 90 days |
| MSG91 / Twilio | Doppler | 180 days |
| DigiLocker | Doppler | per their policy |
| Supabase service key | Doppler | 90 days |
| n8n webhook HMAC | Doppler | 90 days |

No API key ever ships in the Android APK. The Claude API key, in particular, lives only on the backend — the client gets a short-lived JWT.

---

## 14. Versioning & Deprecation

- Claude model versions are pinned (e.g. `claude-haiku-4-5-20251001`) — never use floating aliases in production.
- API endpoints are versioned at the URL prefix (`/v1/`).
- Breaking changes follow a 90-day deprecation window with the old version still served.
- Schema changes to the Claude JSON output are major version bumps and require coordinated client + backend rollout.

---

## 15. Open Items

1. Confirm Karnataka PDS API SLA before committing to ration use-case.
2. Get final DigiLocker partner approval (commercial vs non-commercial tier).
3. Decide Sonnet 4.6 escalation threshold (current default: `confidence < 0.6`).
4. Pre-generate top-1000 cached TTS audio at the CDN edge in v1.1.
