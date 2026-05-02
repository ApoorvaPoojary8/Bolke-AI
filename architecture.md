# BolKe — System Architecture

**Version:** 1.0
**Status:** MVP Architecture
**Last Updated:** May 2026

---

## 1. Architecture Goals

1. **Sub-3-second** voice → spoken reply on a 3G connection.
2. **Cost-bounded** — every external API call must be predictable and capped.
3. **Failure-tolerant** — any single API outage degrades but does not break the app.
4. **Privacy-first** — no raw voice or PII stored beyond TTL.
5. **Stateless backend** so we can scale horizontally on demand.

---

## 2. High-Level System Overview

BolKe follows a **client → API gateway → orchestrator → external services** pattern. The Android client handles UX and audio capture; a thin backend (Node.js + n8n) orchestrates STT, Claude, TTS, and government APIs; persistent state lives in Supabase (Postgres + Storage).

```
┌─────────────────────────────────────────────────────────────────┐
│                      ANDROID CLIENT (Kotlin)                    │
│  Mic UI · Lottie Icons · TTS Player · Offline Cache · SMS Hook │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS (audio blob + metadata)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              API GATEWAY (Node.js / Fastify)                    │
│   Auth (phone-OTP JWT) · Rate Limit · Request Logging           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Google STT   │   │ Claude API   │   │ Google TTS / │
│ (audio→text) │   │ Haiku 4.5    │   │ ElevenLabs   │
└──────────────┘   │ (reasoning)  │   │ (text→audio) │
                   └──────┬───────┘   └──────────────┘
                          │ if action needed
                          ▼
                   ┌──────────────────────────────┐
                   │   n8n ORCHESTRATOR (self-host)│
                   │  DigiLocker · PDS · PMJAY     │
                   │  PHC Dataset · Twilio SMS     │
                   └──────────────────────────────┘
                          │
                          ▼
                   ┌──────────────────────────────┐
                   │   Supabase (Postgres + S3)    │
                   │  Users · Sessions · Cache     │
                   └──────────────────────────────┘
```

---

## 3. Component Breakdown

### 3.1 Android Client
- **Language:** Kotlin (Jetpack Compose, but SimpleViews fallback for low-end devices).
- **Key responsibilities:**
  - Capture audio (16kHz mono PCM, opus-encoded for upload).
  - Render mic button + Lottie icon + TTS playback.
  - Maintain a 24h local cache (Room DB) of last 50 query→reply pairs.
  - Handle network downgrade (3G → 2G → offline).
  - Register for SMS callbacks for long-running actions.
- **Footprint:** ≤15 MB APK, ≤80 MB at runtime.

### 3.2 API Gateway (Node.js + Fastify)
- Stateless, runs on Cloud Run / Fly.io (3 regions: Mumbai, Bengaluru, Singapore).
- Endpoints:
  - `POST /v1/voice` — main entrypoint, accepts opus blob.
  - `POST /v1/auth/otp` and `/verify`.
  - `POST /v1/action/:intent` — proxies to n8n.
  - `GET /v1/health`.
- **Why Fastify:** ~30k req/sec on 1 vCPU, native Schema validation, minimal deps.
- Adds short-lived JWT (1 hour) per device.

### 3.3 Reasoning Layer — Claude API
- **Model:** `claude-haiku-4-5-20251001` (fast, cheap, multilingual).
- **System prompt:** strictly enforces JSON output, same-language reply, 1-sentence answers.
- **Prompt caching enabled** for the system prompt (90% cost reduction on repeat calls).
- **Batch API not used in MVP** — latency-sensitive flow.

### 3.4 Voice Layer
- **STT:** Google Cloud Speech-to-Text v2 (`latest_long` model, all Indic languages enabled).
- **TTS:** Google Wavenet voices for Hindi/Kannada/Tamil/Telugu/Bengali/Marathi.
- **Premium TTS fallback:** ElevenLabs (cloned regional voices) for dialect-heavy queries.

### 3.5 n8n Orchestrator
- Self-hosted on a single VPS (Hetzner or DigitalOcean droplet).
- Purpose: every government API call (DigiLocker, PDS, PMJAY, NREGA) is an n8n workflow.
- **Why n8n:** visual debuggability for non-engineers + free + handles retries, queues, and webhooks.
- Each workflow exposes an internal HTTP endpoint that the gateway calls.

### 3.6 Data Layer — Supabase
- **Postgres** for users, sessions, query logs (PII-stripped), intent analytics.
- **Object storage** for archived audio (24h TTL, then deleted).
- **Row-level security** enforced; API gateway uses service role key only.

### 3.7 SMS Fallback
- **Twilio** for international/general SMS, **MSG91** for India-priced bulk SMS.
- Used for: action confirmations, OTP, failure recovery messages.

---

## 4. Request Lifecycle — "Mera ration card kab aayega?"

| Step | Component | Action | Latency budget |
|------|-----------|--------|----------------|
| 1 | Android | User holds mic, speaks 5 sec | — |
| 2 | Android | Encodes opus, sends to gateway | 200 ms |
| 3 | Gateway | Auth check, forwards to Google STT | 50 ms |
| 4 | Google STT | Returns transcript + language | 600 ms |
| 5 | Gateway | Calls Claude Haiku 4.5 with prompt | 50 ms |
| 6 | Claude API | Returns JSON (reply + intent + icon) | 700 ms |
| 7 | Gateway | If `intent` requires action, fires n8n webhook async | 30 ms |
| 8 | Gateway | Sends `reply` text to Google TTS | 50 ms |
| 9 | Google TTS | Returns MP3 (~30 KB) | 400 ms |
| 10 | Gateway | Streams MP3 + JSON metadata to Android | 200 ms |
| 11 | Android | Plays audio, shows icon | — |
| **Total** | | | **~2.3 sec** |

n8n's downstream calls (DigiLocker, PDS) run **asynchronously** and confirm via SMS so the user is never blocked on a slow government API.

---

## 5. Data Flow & Storage

### 5.1 What we store
| Data | Where | Retention |
|------|-------|-----------|
| Phone number (hashed) | Supabase users table | Forever (until account delete) |
| Transcript text | Supabase logs | 30 days, then anonymized |
| Audio blob | Supabase Storage | 24 hours |
| Intent + icon (analytics) | Supabase logs | 1 year, aggregated |
| DigiLocker tokens | Encrypted in Supabase | Per OAuth session lifetime |

### 5.2 What we never store
- Raw Aadhaar numbers
- Bank balances or transaction history (read-only, never persisted)
- Voice signatures / biometric data

---

## 6. Failure Modes & Resilience

| Failure | Detection | Mitigation |
|---------|-----------|------------|
| Google STT timeout | >2 sec no response | Retry once → fall back to on-device Vosk |
| Claude API 5xx | HTTP code | Retry with exponential backoff (max 2) → static fallback reply |
| Claude returns invalid JSON | Schema validation | Reject + retry once → fallback intent="unknown" |
| TTS fails | HTTP error | Use cached generic "please wait" audio + show text icon |
| n8n down | Health check fails | Queue request, send SMS apology, process when n8n recovers |
| Network drop mid-call | Client detects | Replay locally cached last-good response |
| Gateway region down | Load balancer | Route to next nearest region |

---

## 7. Security Architecture

- **Auth:** Phone-OTP → JWT (1h) → refresh token (30d, device-bound).
- **Transport:** TLS 1.3 enforced; HSTS headers; cert pinning on Android client.
- **Secrets:** All API keys in Doppler / GCP Secret Manager — never in source.
- **Claude API key:** Stored only on backend; client never sees it.
- **DigiLocker:** OAuth 2.0, scoped tokens, encrypted at rest with AES-256.
- **Rate limiting:** 60 queries/hour per device (configurable).
- **Audit log:** All API calls logged with request ID, no PII.

---

## 8. Scalability Plan

| Stage | DAU | Architecture change |
|-------|-----|---------------------|
| MVP | 0–1K | Single Cloud Run instance, single n8n VPS |
| Pilot | 1K–10K | 3-region Cloud Run, n8n on Kubernetes (3 replicas) |
| Scale | 10K–100K | Add Redis cache layer for Claude responses; CDN for TTS audio |
| Production | 100K+ | Migrate STT to streaming; pre-generate TTS for top 1,000 queries |

---

## 9. Cost Model (per 1,000 queries)

| Service | Unit cost | Per 1K queries | Notes |
|---------|-----------|----------------|-------|
| Google STT | $0.024 / min | ~$2.00 | 5 sec avg per query |
| Claude Haiku 4.5 | $1 in / $5 out per MTok | ~$0.50 | ~300 in + 100 out tokens |
| Google TTS Wavenet | $16 / 1M chars | ~$0.40 | ~25 chars per reply |
| Twilio SMS (India) | ~$0.005 each | ~$0.50 | Only ~10% of queries trigger SMS |
| Supabase / hosting | flat | ~$0.20 | amortized |
| **Total** | | **~$3.60 / 1K queries** | **≈ ₹0.30 per query** ✅ |

This sits comfortably under the ₹0.50/query target.

---

## 10. Observability

- **Logs:** Pino → Grafana Loki.
- **Metrics:** Prometheus scraping Fastify; dashboards in Grafana for P50/P95 latency, intent distribution, cost/query.
- **Errors:** Sentry on both Android and Node.
- **Tracing:** OpenTelemetry across Gateway → Claude → n8n.

---

## 11. Deployment

- **CI/CD:** GitHub Actions → Docker → Cloud Run (backend), Play Console internal track (Android).
- **Environments:** `dev` → `staging` → `prod` (separate Supabase projects, Claude API keys).
- **Feature flags:** ConfigCat for per-language rollout.

---

## 12. Architecture Decisions (ADRs in brief)

| ADR | Decision | Reason |
|-----|----------|--------|
| 001 | Use Claude Haiku 4.5 over GPT-4o-mini | Better Indic language quality at similar price |
| 002 | Use n8n over custom orchestrator | Visual debugging + no engineering for new flows |
| 003 | Use Supabase over raw Postgres | Auth + storage + DB in one, cheaper at MVP scale |
| 004 | Native Android (Kotlin), not React Native | Performance on 1 GB RAM devices is critical |
| 005 | Google STT not Whisper | Whisper has weaker Indic dialect coverage in 2026 |

---

## 13. Open Architectural Questions

1. Should we add a Redis cache layer in MVP or wait until 1K DAU?
2. Streaming STT vs. batch — streaming saves ~400 ms but adds complexity; defer to v1.1?
3. Do we self-host TTS (Coqui XTTS-v2) by v2 to control cost?
4. Should `intent` extraction become a fine-tuned smaller model long-term?
