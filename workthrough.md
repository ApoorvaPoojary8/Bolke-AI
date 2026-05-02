# BolKe AI - Development Walkthrough

This document outlines all the modifications, enhancements, and testing procedures implemented in the BolKe AI project since the last commit. Our primary focus has been integrating a high-quality, multilingual Text-to-Speech (TTS) pipeline, establishing a robust fallback mechanism, and thoroughly validating the backend infrastructure.

---

## 1. ElevenLabs TTS Integration (Primary Provider)
We have successfully integrated **ElevenLabs Multilingual v2** as our primary Text-to-Speech (TTS) provider, replacing the previous Cartesia Sonic-2 implementation (which has now been demoted to a fallback). 

ElevenLabs was chosen for its superior dialect accuracy and natural warmth, particularly for Indian languages (Hindi, Kannada, Tamil, Telugu, Bengali, Marathi) alongside English.

### Backend Updates (`apps/backend/`)
*   **New Service Created**: `src/services/tts/elevenLabsTts.ts`
    *   Implemented the `synthesise()` function using the official ElevenLabs REST API.
    *   Configured the `eleven_multilingual_v2` model.
    *   Set up optimal voice settings for natural cadence (`stability: 0.5`, `similarity_boost: 0.75`).
    *   Assigned the 'Rachel' voice (`EXAVITQu4vr4xnSDxMaL`) globally, as it performs excellently across regional dialects.
*   **Pipeline & Routes Updated**: 
    *   `src/routes/api.ts` and `src/services/voicePipeline.ts` were updated to route TTS requests through ElevenLabs first.
    *   The Health check endpoint (`/v1/health`) was updated to report the status of the ElevenLabs integration alongside Cartesia.
*   **Environment Configuration**: Added `ELEVENLABS_API_KEY` to both `.env` and `.env.example`.
*   **Dependencies**: Added the `@elevenlabs/elevenlabs-js` or required network packages to support the endpoints.

### Frontend Updates (`apps/web/`)
*   **Service Expansion**: Added `speakWithElevenLabs()` in `src/services/aiProviders.js` to allow the web frontend to communicate directly with the ElevenLabs API when the backend is bypassed (Direct AI Pipeline mode).
*   **Dispatcher Logic Updated**: Modified `src/services/api.js` to check for `VITE_ELEVENLABS_API_KEY` first, falling back to Cartesia, and finally defaulting to the browser's native `speechSynthesis`.

---

## 2. Robust 3-Tier Fallback Mechanism
To guarantee uptime and an uninterrupted user experience, we implemented a strict 3-tier fallback chain on the backend.

**The Chain:**
1.  **ElevenLabs Multilingual v2** (Primary)
2.  **Cartesia Sonic-2** (Secondary Fallback)
3.  **Browser Native TTS / Error Handling** (Last Resort)

**How it works:**
Inside `elevenLabsTts.ts`, all external calls are wrapped in a `try/catch` block. If ElevenLabs returns a non-200 status code (e.g., `401 Unauthorized` due to a bad key, or a rate limit), or if the resulting audio buffer is suspiciously small (<100 bytes), the system catches the error, logs a warning (`[TTS] Falling back to Cartesia...`), and instantly reroutes the text payload to `cartesiaSynthesise()`.

---

## 3. Postman Validation Suite
To ensure the pipeline remains stable during future development, a comprehensive Postman testing suite was generated and injected into a dedicated workspace.

*   **Workspace**: `BolKe AI — TTS Testing`
*   **Environment**: `BolKe Local Dev` (Houses variables like `{{base_url}}` and `{{api_prefix}}`)
*   **Collection**: `ElevenLabs TTS Pipeline Validation`

**The collection contains 4 rigorous scenarios:**
1.  **Test 1 — TTS Basic**: Validates the happy path, ensuring 200 OK and a proper `audio/mpeg` payload.
2.  **Test 2 — Broken Input**: Submits empty payloads and missing text fields to ensure the API rejects bad data with a `400 Bad Request`.
3.  **Test 3 — Force Fallback**: Intentionally tests the Cartesia fallback chain.
4.  **Test 4 — Large Text Payload**: Ensures the API does not truncate or timeout when synthesizing very large paragraphs (tested with ~500KB audio buffers taking ~6s).

---

## 4. Environment & Process Fixes
During testing, a few operational hiccups were identified and resolved:
*   **`.env` Formatting Fix**: The `ELEVENLABS_API_KEY` in `apps/backend/.env` was initially placed on the same line as a comment due to an escaped `\r\n` literal. This prevented `dotenv` from parsing the key correctly. The file was rewritten to ensure the key sits on a clean, isolated line.
*   **`EADDRINUSE` Port Collision**: During the switch from background testing to manual terminal testing, a background `node` process was left occupying port `3001`. The rogue process (PID 16424) was tracked down and forcefully terminated, freeing the port for standard `npm run dev` operations.

---

## Next Steps
With the Voice Pipeline fully architected (Deepgram STT → Groq LLM → ElevenLabs TTS), the system is ready for **End-to-End Latency Profiling** or integration with the frontend UI visualization layer.
