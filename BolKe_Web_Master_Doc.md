# BolKe — Unified Web Application Master Document

**Version:** 1.0 (Web Edition)
**Last Updated:** May 2026

This document unifies the BolKe PRD, Architecture, Design, Tech Stack, Folder Structure, Model & API, and the Step-by-Step Implementation guide into a **single, comprehensive reference**. It has been specifically adapted to build BolKe as a **Progressive Web Application (PWA)** instead of a native Android app.

---

## 1. PRODUCT REQUIREMENTS (PRD)

BolKe is a voice-first, icon-driven AI assistant built for users who cannot read fluently and rely on entry-level smartphones. Users speak in their native language; BolKe responds with audio plus large animated icons. 

### Core Goals
- **Platform:** Mobile-first Web App (PWA), accessible via any browser without app store installation.
- **Workflow:** Working voice → action loop in under 3 taps for 5 high-value use cases.
- **Languages:** Hindi, Kannada, Tamil, Telugu, Bengali, Marathi.
- **Performance:** <3-second response time on a 3G connection.
- **Cost:** <₹0.50 per query in production cost.

### 5 MVP Use Cases
1. **Ration card status:** "Mera ration card kab milega?"
2. **Nearest hospital:** "Pass mein hospital dikhao" (Uses HTML5 Geolocation)
3. **Government scheme eligibility:** "Mujhe pension chahiye"
4. **DigiLocker document fetch:** "Mera Aadhaar dikhao"
5. **Bank balance check:** "Mera balance batao"

### Functional Requirements (Web-Specific)
- **Voice Input:** Single large microphone button (≥40% of viewport width). Uses HTML5 `MediaRecorder` API.
- **PWA Capabilities:** Must be installable to the home screen (manifest.json).
- **Offline Mode:** Service Workers to cache the app shell. Fallback to native Browser Web Speech API for offline/low-latency STT when possible.
- **Audio Output:** HTML5 `<audio>` element for playback.

---

## 2. SYSTEM ARCHITECTURE

BolKe follows a **Client → API Gateway → Orchestrator → External Services** pattern.

```text
┌─────────────────────────────────────────────────────────────────┐
│                      WEB CLIENT (React PWA)                     │
│  Mic UI · CSS Animations · Audio Player · Service Worker        │
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
                   │   n8n ORCHESTRATOR           │
                   └──────────────────────────────┘
                          │
                          ▼
                   ┌──────────────────────────────┐
                   │   Supabase (Postgres + S3)   │
                   └──────────────────────────────┘
```

---

## 3. TECH STACK (WEB EDITION)

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | React 18 + Vite | Fast PWA build, component-based UI. |
| **Styling** | Vanilla CSS | Maximum flexibility, custom glassmorphism, no bloated frameworks. |
| **Animations** | Lottie-Web | For animated vector icons (≤50KB). |
| **Audio Capture** | `MediaRecorder` API | Native browser support for opus/webm. |
| **Backend** | Node.js 20 + Fastify | Speed + tiny memory footprint. |
| **Reasoning** | Claude Haiku 4.5 | Best multilingual at lowest cost. |
| **Orchestration** | n8n (self-hosted) | Visual workflows, free, debuggable. |
| **Database/Auth**| Supabase (Postgres) | Auth + DB + storage in one. |

*Note: React Native and Android Kotlin have been removed in favor of a standard React PWA.*

---

## 4. FOLDER STRUCTURE

```text
bolke/
├── apps/
│   ├── web/                      # React PWA (Vite)
│   │   ├── public/               # manifest.json, service-worker.js, icons
│   │   ├── src/
│   │   │   ├── components/       # MicButton.jsx, LottieIcon.jsx
│   │   │   ├── screens/          # Splash.jsx, Home.jsx, Reply.jsx
│   │   │   ├── hooks/            # useMic.js, useAudio.js
│   │   │   ├── styles/           # index.css, variables.css
│   │   │   └── utils/            # api.js
│   │   ├── index.html
│   │   └── package.json
│   └── backend/                  # Node.js + Fastify API gateway
├── packages/
│   ├── shared-types/             # TS types shared by backend + web
│   ├── prompts/                  # Claude system prompts
│   └── i18n/                     # Translation strings
├── workflows/n8n/                # Exported n8n JSON workflows
├── infra/                        # Docker, Supabase migrations
└── pnpm-workspace.yaml
```

---

## 5. MODEL & API REFERENCE

- **Claude API:** `claude-haiku-4-5-20251001`. Prompt caching used. Max tokens: 300.
- **Claude JSON Schema:**
  ```json
  {
    "reply": "string (≤200 chars, 1 sentence)",
    "intent": "ration|hospital|bank|transport|pension|document|scheme_eligibility|unknown",
    "icon": "hospital|ration|bank|transport|pension|document|phone|unknown",
    "language": "hi|kn|ta|te|bn|mr|en",
    "action_url": "string or null",
    "confidence": 0.0-1.0
  }
  ```
- **Internal API Endpoints:**
  - `POST /v1/auth/otp`
  - `POST /v1/auth/verify`
  - `POST /v1/voice` (Accepts multipart/form-data with webm/opus audio blob)
  - `POST /v1/action/:intent`

---

## 6. DESIGN TENETS & AESTHETICS

- **Glassmorphism & 3D Elements:** The UI should feel premium, responsive, and alive. Use subtle gradients, soft shadows, and backdrop filters for a glassmorphic effect.
- **Typography:** Modern typography (e.g., Inter, Roboto). Minimum size 24px for body text.
- **Colors:**
  - Primary (Saffron): `#FF7A29`
  - Background (Cream): `#FFF8EE`
  - Deep Green: `#0E8C5B`
- **Interactions:** The mic button expands (≥40% width to ≥60%) and pulses based on audio amplitude. Smooth micro-animations for state transitions.

---

## 7. STEP-BY-STEP IMPLEMENTATION (WEB)

### PHASE 0 — Foundation & Repo Setup
1. Initialize a pnpm monorepo with `apps/web` (using `npm create vite@latest web -- --template react`) and `apps/backend`.
2. Setup `shared-types` (Zod schemas for Claude responses).
3. Setup `packages/i18n` for language YAML files.

### PHASE 1 — Infrastructure
1. Create Supabase project and run SQL migrations (`users`, `sessions`, `query_logs`, `audio_uploads`).
2. Set up Doppler for secrets (`ANTHROPIC_API_KEY`, etc.).
3. Spin up n8n via Docker.

### PHASE 2 — Backend: Gateway
1. Initialize Fastify server in `apps/backend`.
2. Add `@fastify/multipart`, `@fastify/cors` (allow web client origins), and `@fastify/rate-limit`.
3. Implement `/v1/auth/otp` and `/v1/auth/verify`.

### PHASE 3 — AI Pipeline
1. Integrate Google Cloud STT (`@google-cloud/speech`) to transcribe webm/opus blobs.
2. Integrate Anthropic SDK for `claude-haiku-4-5-20251001` intent parsing.
3. Integrate Google TTS to generate MP3 replies.
4. Wire them all in the `POST /v1/voice` endpoint.

### PHASE 4 — n8n Workflows
1. Create and export `pds_ration_status.json`, `pmjay_hospital_lookup.json`, `sms_confirm.json`.
2. Configure webhook HMAC validation.

### PHASE 5 — Web App: Core UI & Audio
1. **Styling:** Set up `index.css` with CSS variables for Saffron, Cream, and glassmorphism utilities.
2. **MicButton Component:** Create a large, circular button with CSS pulse animations. Use `framer-motion` or vanilla CSS transitions.
3. **Audio Capture:** Implement `useMic.js` hook using `navigator.mediaDevices.getUserMedia` and `MediaRecorder`.
4. **Playback:** Implement `useAudio.js` hook to play the returned `reply_audio_url`.

### PHASE 6 — Web App: PWA & Screens
1. **PWA Setup:** Add `manifest.json` and a basic Service Worker (`service-worker.js`) to cache the app shell and allow "Add to Home Screen".
2. **Screens:**
   - `Splash.jsx`: Logo + language detect.
   - `Auth.jsx`: Phone number input with large keys.
   - `Home.jsx`: The giant mic button.
   - `Reply.jsx`: Displays the returned Lottie icon + plays audio automatically + shows action button if applicable.
3. **Offline Fallback:** If `navigator.onLine` is false, use the Web Speech API (`webkitSpeechRecognition`) for basic offline transcription, and show a cached text reply.

### PHASE 7 — Integration (The 5 Flows)
1. Wire the frontend `fetch` to `POST /v1/voice`.
2. Test Flow 1: Ration status (Mic -> Backend -> Claude -> Reply -> Action -> n8n).
3. Test Flow 2: Hospital lookup (Use `navigator.geolocation.getCurrentPosition` before sending the request).

### PHASE 8 — Hardening & Polish
1. **Resilience:** Handle STT timeouts, Claude 5xx errors, and network drops gracefully in the UI.
2. **Accessibility:** Ensure the UI is fully navigable via screen readers (though voice is primary).
3. **Animations:** Add waveform visualizers during the "Listening" state.
4. **Deployment:** Deploy the Web App to Vercel/Netlify, Backend to Cloud Run.

---
**END OF UNIFIED DOCUMENT**
