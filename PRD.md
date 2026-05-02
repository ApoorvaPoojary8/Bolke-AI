# BolKe — Product Requirements Document (PRD)

**Project Codename:** BolKe (बोल के — "just speak it")
**Document Version:** 1.0
**Last Updated:** May 2026
**Owner:** Product / Founding Team
**Status:** Draft → MVP

---

## 1. Executive Summary

BolKe is a voice-first, icon-driven AI assistant built for the **500M+ Indians who cannot read fluently, do not type in English, and rely on entry-level Android phones**. Users speak in their native language; BolKe responds with audio plus large animated icons. There are no menus, no typing, and no reading required.

The product collapses access to government schemes, ration card status, hospital appointments, and basic banking into **3 taps or fewer**, completed entirely by voice.

---

## 2. Problem Statement

### 2.1 The Gap
- ~30% of India's adult population is functionally low-literate.
- Existing apps (UMANG, DigiLocker, BHIM) assume English/Hindi reading ability and a smartphone-savvy user.
- Voice assistants like Google Assistant solve general queries but do not **complete government workflows** end-to-end.
- Rural users currently rely on paid intermediaries (CSC agents, "form fillers") who charge ₹50–500 per simple task.

### 2.2 The Opportunity
A single tap-and-speak interface that:
- Understands 12+ Indian languages and dialects.
- Responds with voice + visual icons (no reading required).
- Automates the actual filing/lookup via government APIs (DigiLocker, PMJAY, etc.).
- Works on 2G/3G low-end Android phones (≤2 GB RAM).

---

## 3. Target Users & Personas

### Persona 1 — "Lakshmi", 52, rural Karnataka
- Speaks Kannada only; cannot read Hindi or English.
- Has a ₹4,000 Android phone, uses WhatsApp voice notes.
- Needs: Check ration card status, find nearest PHC, apply for widow pension.
- Pain: Currently pays a neighbour ₹100 per government form.

### Persona 2 — "Ramesh", 38, migrant worker in Mumbai
- Native Bhojpuri speaker, basic spoken Hindi.
- Needs: Send money home, check Aadhaar-linked bank balance, find hospital.
- Pain: Bank app is in English; cannot read transaction confirmations.

### Persona 3 — "Anita", 19, first-generation smartphone user, Bihar
- Wants to apply for a scholarship.
- Pain: Forms are PDFs in English; she can speak Hindi fluently but reads slowly.

---

## 4. Goals & Non-Goals

### 4.1 Goals (MVP)
1. Deliver a **working voice → action loop in under 3 taps** for 5 high-value use cases.
2. Support **6 Indian languages** at launch: Hindi, Kannada, Tamil, Telugu, Bengali, Marathi.
3. Achieve **<3-second response time** on a 3G connection.
4. Operate at **<₹0.50 per query** in production cost.
5. Function with **zero text reading** required from the user.

### 4.2 Non-Goals (MVP)
- Not a general-purpose chatbot (no open-domain Q&A).
- No iOS app at launch.
- No multi-step conversational threading beyond 2 turns.
- No web version.
- No payments/UPI integration in v1 (read-only banking info).

---

## 5. Core Use Cases (MVP — 5 flows)

| # | Flow | User says (example) | BolKe does |
|---|------|---------------------|------------|
| 1 | Ration card status | "Mera ration card kab milega?" | Pulls status via state PDS API, plays voice + icon |
| 2 | Nearest hospital | "Pass mein hospital dikhao" | GPS + government PHC dataset, opens map with voice directions |
| 3 | Government scheme eligibility | "Mujhe pension chahiye" | Asks 3 voice questions (age, gender, income), returns matching schemes |
| 4 | DigiLocker document fetch | "Mera Aadhaar dikhao" | OAuth into DigiLocker, fetches doc, reads aloud |
| 5 | Bank balance check | "Mera balance batao" | Account aggregator API → spoken balance |

---

## 6. Functional Requirements

### 6.1 Voice Input
- **FR-1.1:** Single large microphone button on home screen (≥40% of screen).
- **FR-1.2:** Press-and-hold-to-talk (preferred for low-literacy users).
- **FR-1.3:** Auto-detect language from speech (no language selection menu).
- **FR-1.4:** Visual feedback during recording (pulsing animation).
- **FR-1.5:** Maximum recording length: 15 seconds.

### 6.2 Speech-to-Text (STT)
- **FR-2.1:** Use Google Cloud STT with `model=latest_long`, `enableAutomaticPunctuation=true`.
- **FR-2.2:** Send detected language code to Claude API for response matching.
- **FR-2.3:** Fallback to on-device Vosk model if offline.

### 6.3 Reasoning & Intent Detection
- **FR-3.1:** Send transcribed text to Claude Haiku 4.5 (`claude-haiku-4-5`).
- **FR-3.2:** Claude returns strict JSON: `{ reply, intent, icon, action_url, language }`.
- **FR-3.3:** System prompt enforces same-language reply and one-sentence brevity.
- **FR-3.4:** If `intent` is unknown → return safe fallback ("Sorry, please try again").

### 6.4 Output (Voice + Visual)
- **FR-4.1:** Text-to-Speech via Google Cloud TTS (Wavenet voices) for primary languages; ElevenLabs as premium fallback for dialects.
- **FR-4.2:** Display large icon (≥30% screen) matching the `icon` field.
- **FR-4.3:** Icons are animated (Lottie) and labeled in regional script as a secondary cue only.
- **FR-4.4:** No body text under 24sp; no menus.

### 6.5 Action Layer
- **FR-5.1:** If `action_url` is returned, render a single large "Do it" button with icon.
- **FR-5.2:** Button triggers an n8n webhook that orchestrates the actual API call (DigiLocker, PDS, etc.).
- **FR-5.3:** All long-running tasks return SMS confirmation via Twilio/MSG91.

### 6.6 Offline & Low-Bandwidth
- **FR-6.1:** App functions on 2G with text-only fallback (queue voice for later upload).
- **FR-6.2:** Critical replies cached locally for 24 hours.
- **FR-6.3:** Total app size <25 MB (target <15 MB).

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | P95 voice → spoken reply ≤ 3 seconds on 3G |
| **Reliability** | ≥99.5% uptime; graceful degradation when any API fails |
| **Cost** | ≤ ₹0.50 per query at 1,000 DAU |
| **Privacy** | No voice recordings stored beyond 24h; transcripts anonymized |
| **Security** | TLS 1.3, no PII in Claude logs, DigiLocker OAuth scoped per-session |
| **Accessibility** | WCAG AA where applicable, minimum touch target 48dp, contrast ≥ 4.5:1 |
| **Compatibility** | Android 7.0+ (API 24), 1 GB RAM minimum |

---

## 8. Success Metrics

### 8.1 Activation
- ≥60% of new installs complete 1 successful voice query within 5 minutes.

### 8.2 Engagement
- ≥3 queries/user/week in month 2.
- ≥40% week-4 retention.

### 8.3 Quality
- Intent recognition accuracy ≥85% across 6 languages.
- TTS comprehension (user testing) ≥4.0 / 5.0.

### 8.4 Cost
- Blended cost per query <₹0.50 at 10K MAU.
- Claude API portion <₹0.10 per query (Haiku).

### 8.5 Impact
- ≥10,000 government workflows successfully completed in first 6 months.

---

## 9. User Journey (Happy Path — Use Case 1)

1. User opens BolKe → sees one giant red mic button.
2. Presses and holds → speaks: *"Mera ration card kab aayega?"* (Hindi).
3. Releases button → ring animation while STT + Claude run (~2 sec).
4. App speaks: *"Aapka ration card 5 din mein aayega."* + shows ration-bag icon.
5. Below the icon: one button with phone icon → tap to call PDS helpline.
6. Done — total taps: 1 (mic) + optional 1 (call).

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low STT accuracy for dialects | High | Fine-tune with 1,000+ regional voice samples; add Vosk on-device fallback |
| DigiLocker API rate limits | Medium | Cache responses; implement queue with retries via n8n |
| Claude API cost spike | Medium | Use Haiku 4.5; aggressive prompt caching; batch where possible |
| User mistrust of AI voice | High | Use known regional voice actors via ElevenLabs cloning |
| Misinformation on schemes | Critical | Whitelist verified data sources; Claude system prompt forbids invented scheme names |
| Connectivity in rural areas | High | SMS fallback for all completed actions |

---

## 11. Out-of-Scope (Future Roadmap)

- v1.1: UPI voice payments
- v1.2: Tutorial/onboarding voice walkthrough
- v1.3: Family-shared profiles (one phone, multiple users)
- v2.0: Feature-phone IVR access (dial-a-BolKe)
- v2.1: Asha worker / village kiosk mode

---

## 12. Open Questions

1. Do we require Aadhaar at signup or use phone-OTP only? (Decision needed by sprint 2.)
2. Which state's PDS API do we integrate first? (Karnataka recommended — best documented.)
3. Premium ElevenLabs voices vs. Google Wavenet — quality vs. cost trade-off needs A/B test.
4. Do we own the SMS sender ID or use shared shortcode initially?

---

## 13. Approvals

| Role | Name | Sign-off |
|------|------|----------|
| Product | TBD | ☐ |
| Engineering | TBD | ☐ |
| Design | TBD | ☐ |
| Compliance | TBD | ☐ |
