# BolKe — Tech Stack

**Version:** 1.0
**Last Updated:** May 2026

This document is the single source of truth for every library, service, and tool used in BolKe. If it isn't listed here, it isn't approved for the codebase.

---

## 1. Stack at a Glance

| Layer | Choice | Why |
|-------|--------|-----|
| Mobile | Kotlin + Jetpack Compose | Native performance on low-RAM devices |
| Backend | Node.js 20 + Fastify | Speed + tiny memory footprint |
| Reasoning | Claude Haiku 4.5 | Best multilingual at lowest cost |
| STT | Google Cloud Speech-to-Text v2 | Best Indic language coverage |
| TTS | Google Wavenet + ElevenLabs | Quality + cost balance |
| Orchestration | n8n (self-hosted) | Visual workflows, free, debuggable |
| Database | Supabase (Postgres) | Auth + DB + storage in one |
| Storage | Supabase Storage (S3-compatible) | Cheap, integrated |
| SMS | MSG91 (India) + Twilio (international) | Best India SMS rates |
| Auth | Phone OTP via Supabase Auth | Familiar to Indian users |
| Hosting | Cloud Run (gateway) + Hetzner VPS (n8n) | Pay-per-request + flat-rate hybrid |
| Monitoring | Sentry + Grafana + Prometheus | Standard, open |
| CI/CD | GitHub Actions | Free for private repos under thresholds |

---

## 2. Mobile Stack (Android)

### 2.1 Core
- **Kotlin** 2.0+
- **Android Gradle Plugin** 8.5+
- **Min SDK:** 24 (Android 7.0)
- **Target SDK:** 35 (Android 15)

### 2.2 UI
- **Jetpack Compose** 1.7+ — primary UI toolkit.
- **Material 3** — components, dialogs.
- **Lottie for Android** 6.x — animated icons.
- **Coil** 2.x — image loading.

### 2.3 Audio
- **MediaRecorder** (built-in) for capture.
- **Opus codec** for upload (smaller than MP3, low-bandwidth friendly).
- **ExoPlayer (Media3)** for TTS playback.

### 2.4 Networking
- **Ktor Client** 3.x — coroutine-friendly, multiplatform-ready.
- **kotlinx.serialization** for JSON.
- **OkHttp** for cert pinning + interceptors.

### 2.5 Local persistence
- **Room** 2.6+ — query/reply cache.
- **DataStore** for preferences (replaces SharedPreferences).

### 2.6 DI & Architecture
- **Koin** — lightweight DI (Hilt is heavier on cold start).
- **MVVM** + **UseCases** + Kotlin **StateFlow**.

### 2.7 Offline / fallback
- **Vosk** (Kaldi-based) on-device STT for offline Hindi/English (~50 MB model).
- **Workmanager** for retry queue when network returns.

### 2.8 Testing
- **JUnit 5** + **MockK** for unit.
- **Compose UI Testing** for screens.
- **Maestro** for end-to-end flow testing.

---

## 3. Backend Stack (API Gateway)

### 3.1 Runtime
- **Node.js 20 LTS**
- **TypeScript 5.4**

### 3.2 Framework
- **Fastify 5.x** — chosen over Express for ~3x throughput and built-in JSON schema validation.

### 3.3 Key libraries
- **@anthropic-ai/sdk** — official Claude SDK.
- **@google-cloud/speech** — STT.
- **@google-cloud/text-to-speech** — TTS.
- **zod** — runtime schema validation.
- **pino** — structured logging.
- **undici** — HTTP client.
- **bullmq** — job queue (used only for SMS retries).

### 3.4 Auth & Security
- **jose** — JWT signing/verification.
- **@fastify/rate-limit** — per-IP and per-device limits.
- **@fastify/helmet** — security headers.
- **@fastify/cors** — strict origin policy.

### 3.5 Database access
- **postgres.js** (the `postgres` npm package) — fast, no ORM needed for simple schema.
- Supabase REST/Realtime when needed for client-side reactive features.

### 3.6 Testing
- **Vitest** — unit + integration.
- **Supertest** — endpoint tests.
- **Playwright** — synthetic monitoring (post-deploy smoke tests).

---

## 4. AI / API Services

### 4.1 Claude API
- **Model:** `claude-haiku-4-5-20251001` (primary).
- **Fallback:** `claude-sonnet-4-6` for ambiguous queries (auto-escalation, <5% of traffic).
- **Pricing (May 2026):**
  - Haiku 4.5: **$1 / 1M input**, **$5 / 1M output**.
  - Sonnet 4.6: **$3 / 1M input**, **$15 / 1M output**.
- **Features used:** prompt caching (90% input discount on cached system prompt), tool-use **not** used in MVP to avoid the ~346-token overhead per call.

### 4.2 Google Cloud
- **Speech-to-Text v2** — `latest_long` model, automatic punctuation, regional Indic models.
- **Text-to-Speech** — Wavenet voices for hi-IN, kn-IN, ta-IN, te-IN, bn-IN, mr-IN.
- **Pricing:** STT $0.024/min after free tier; TTS Wavenet $16/1M chars.

### 4.3 ElevenLabs
- **Voice Cloning** — for premium "Saroja" persona across languages.
- **Multilingual v2 model** — Indic language support.
- **Pricing:** Creator tier starting at ~$22/month for 100K chars.

### 4.4 DigiLocker API
- Government-issued, free for non-commercial.
- OAuth 2.0 flow.
- Used for: Aadhaar (masked), driving licence, PAN, school certificates.

---

## 5. Orchestration Layer

### 5.1 n8n (self-hosted)
- **Version:** 1.x latest stable.
- **Hosted on:** Hetzner CX22 (€5/mo, 2 vCPU, 4 GB RAM) initially.
- **Workflows planned for MVP:**
  1. DigiLocker fetch
  2. PDS ration status check
  3. PMJAY hospital lookup
  4. SMS retry / confirmation
  5. Failure notification

### 5.2 Why n8n vs custom Node code
- Visual workflows mean a non-engineer can update form mappings.
- Built-in retry, error branching, queue management.
- Open-source, no vendor lock-in.
- Self-hosted = no per-execution fees.

---

## 6. Data Stack

### 6.1 Supabase
- **Project plan:** Free tier for MVP, upgrade to Pro ($25/mo) at 1K DAU.
- **Used for:**
  - Postgres (users, sessions, query_logs, intents)
  - Auth (phone OTP)
  - Storage (audio blobs, 24h TTL)
  - Realtime (not used in MVP)

### 6.2 Schema (Postgres) — core tables
```
users (id, phone_hash, language_pref, created_at)
sessions (id, user_id, jwt_id, expires_at)
query_logs (id, user_id, intent, language, latency_ms, cost_paise, created_at)
audio_uploads (id, user_id, storage_path, expires_at)
digilocker_tokens (user_id, encrypted_token, expires_at)
```

### 6.3 Caching
- MVP: no Redis. Use Postgres + Supabase Edge cache.
- Post-MVP: **Upstash Redis** (serverless, pay-per-request) for top-100 cached Claude responses.

---

## 7. Communications

### 7.1 SMS
- **MSG91** for India — ~₹0.20/SMS, DLT-compliant sender IDs.
- **Twilio** as fallback / for international.

### 7.2 Push Notifications
- **Firebase Cloud Messaging (FCM)** — for Android push (action confirmations).

---

## 8. Infrastructure & DevOps

### 8.1 Hosting
| Service | Provider | Why |
|---------|----------|-----|
| API Gateway | Google Cloud Run (Mumbai region) | Auto-scale, pay-per-request, low India latency |
| n8n | Hetzner VPS (Falkenstein DE) | Flat €5/mo, no per-exec cost |
| Supabase | Supabase Cloud (Singapore) | Closest region with full Indic locale support |

### 8.2 Domains & SSL
- **Cloudflare** — DNS + DDoS + free SSL.

### 8.3 Secrets
- **Doppler** — single source for all environment secrets, syncs to Cloud Run.

### 8.4 CI/CD
- **GitHub Actions** for build, test, deploy.
- **Fastlane** for Android Play Store uploads.
- **Docker** images pushed to Google Artifact Registry.

### 8.5 Monitoring
- **Sentry** — errors (Android + Node).
- **Grafana Cloud** (free tier) — dashboards.
- **Prometheus** — metrics scraping.
- **Uptime Robot** — public uptime checks.

---

## 9. Development Tools

| Purpose | Tool |
|---------|------|
| IDE (Android) | Android Studio Hedgehog+ |
| IDE (Backend) | VS Code / Cursor |
| API testing | Bruno (open-source Postman alternative) |
| Design | Figma |
| Project mgmt | Linear |
| Docs | This repo (Markdown) |
| Diagrams | Mermaid + Excalidraw |
| Voice prototyping | ElevenLabs Studio |

---

## 10. Versioning Policy

- **Mobile:** SemVer (`major.minor.patch`); minor bumps for new languages, major for redesigns.
- **Backend:** API versioned at URL `/v1/`, `/v2/`. Breaking changes only across major versions.
- **Schemas:** All Claude JSON outputs validated with zod; schema changes are major versions.

---

## 11. License & Compliance

- All open-source dependencies must be **MIT, Apache-2.0, or BSD-3-Clause**.
- GPL/AGPL libraries are forbidden in the mobile or backend codebases.
- DigiLocker integration follows MeitY guidelines; data localization in India region.
- DPDP Act 2023 compliance: data minimization, user consent, right to delete.

---

## 12. Stack Decisions Rejected (for the record)

| Considered | Rejected because |
|------------|------------------|
| React Native | Bundle size + perf on 1 GB RAM devices |
| Flutter | Smaller community for Android-only optimization |
| Whisper (OpenAI) | Weaker Indic dialect coverage than Google STT in 2026 |
| GPT-4o-mini | Slightly cheaper but worse Hindi/Tamil reasoning quality |
| Express.js | ~3x slower than Fastify, more middleware bloat |
| Firebase Auth | Phone OTP cost & vendor lock-in vs Supabase |
| MongoDB | Relational shape of data (users, intents) fits Postgres better |
| Pulumi/Terraform | Overkill for MVP; Cloud Run YAML + n8n manual is enough |
