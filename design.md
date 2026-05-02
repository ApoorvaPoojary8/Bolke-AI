# BolKe — Design Document (UX & UI)

**Version:** 1.0
**Last Updated:** May 2026
**Owner:** Design Lead

---

## 1. Design Philosophy

BolKe is built around a single, ruthless principle:

> **If a user has to read it, we have failed.**

Every screen must be operable by someone who cannot read at all. Words exist as a secondary cue — the icon, the voice, and the animation are the primary interface.

### Five Design Tenets
1. **Voice is the default** — typing is a fallback, not a feature.
2. **One thumb, one tap** — every action reachable with one hand.
3. **Big means trustworthy** — large icons, large fonts, large taps.
4. **Animation is feedback** — silent UI feels broken to first-time users.
5. **Familiarity over cleverness** — use icons people already know (phone, hospital cross, food bag).

---

## 2. Visual Language

### 2.1 Colour System

| Role | Hex | Usage |
|------|-----|-------|
| Primary (Saffron) | `#FF7A29` | Mic button, primary CTA |
| Secondary (Deep Green) | `#0E8C5B` | Success, confirmation icons |
| Background (Cream) | `#FFF8EE` | App background — easy on the eyes in sunlight |
| Surface (White) | `#FFFFFF` | Cards |
| Text (Charcoal) | `#1F1F1F` | Used minimally — labels only |
| Error (Red) | `#D9342B` | Failures, retry |
| Disabled (Stone) | `#9C9384` | Inactive states |

Colours are chosen for **high-contrast outdoor sunlight visibility** (rural use case) and to align with culturally familiar palettes (saffron, green).

### 2.2 Typography

- **Primary font:** Noto Sans Devanagari / Tamil / Kannada / Bengali / Telugu / Latin (multi-script, bundled).
- **Body minimum:** 24sp.
- **Heading minimum:** 32sp bold.
- **Never below 18sp** anywhere in the app.
- Letter-spacing slightly increased (0.5sp) for clarity at distance.

### 2.3 Iconography

Icons follow **rounded, filled, high-contrast** style — they must read at 64dp from arm's length.

| Use case | Icon | Source |
|----------|------|--------|
| Hospital | Red cross + building | Custom Lottie |
| Ration | Grocery bag with grain | Custom Lottie |
| Bank | Rupee + wallet | Custom Lottie |
| Transport | Bus front view | Custom Lottie |
| Pension | Elder + rupee | Custom Lottie |
| Document | Paper with seal | Custom Lottie |
| Phone call | Phone receiver pulse | Custom Lottie |

**Rule:** every icon used in the app must have a **Lottie animated version** (≤50 KB each).

### 2.4 Spacing & Sizing

- 8dp grid system.
- Minimum touch target: **64dp** (exceeds Material's 48dp).
- Mic button: **240dp diameter** (≥40% of typical 5.5" screen width).
- Reply icon: **160dp** square.
- Side margins: 24dp.

---

## 3. Screen Inventory (MVP)

| # | Screen | Purpose |
|---|--------|---------|
| 1 | Splash | Brief brand + auto language detect prep |
| 2 | Phone OTP | One field, voice-prompted: "Apna phone number bolen" |
| 3 | Home | Single giant mic button |
| 4 | Listening | Pulsing animation while user speaks |
| 5 | Thinking | Spinner + "Soch raha hoon..." voice line |
| 6 | Reply | Big icon + voice playback + optional action button |
| 7 | Action confirm | "Aapka kaam ho gaya" + SMS preview |
| 8 | Failure | Friendly retry with voice prompt |
| 9 | Settings | One screen, voice-only navigation |

That's it. Nine screens. No menus, no tabs, no drawers.

---

## 4. Detailed Screen Specs

### 4.1 Home Screen

```
┌─────────────────────────────────────┐
│                                     │
│           BolKe (logo)              │
│                                     │
│                                     │
│         ┌─────────────────┐         │
│         │                 │         │
│         │       🎤        │         │ <- 240dp Lottie mic, pulses gently
│         │                 │         │
│         │   Press & hold  │         │ <- Voice prompt: "Mic dabakar bolen"
│         │                 │         │
│         └─────────────────┘         │
│                                     │
│                                     │
│      [Recent: Hospital | Ration]    │ <- Last 2 queries as icons (optional)
│                                     │
└─────────────────────────────────────┘
```

- Mic button gently pulses every 2 seconds to invite tap.
- "Press & hold" label is shown ONCE on first run, then hidden after first successful query.
- Voice prompt (Hindi by default, then user's detected language) plays after 3 sec of inactivity.

### 4.2 Listening State

- The 240dp mic button **expands to 320dp**, pulsing with the user's voice amplitude.
- Background dims slightly to focus attention.
- A subtle waveform appears below the mic.
- "Sun raha hoon..." spoken softly only on first session.

### 4.3 Reply Screen

```
┌─────────────────────────────────────┐
│      ←                              │ <- Back arrow only, no menu
│                                     │
│         ┌─────────────────┐         │
│         │                 │         │
│         │    [HOSPITAL    │         │ <- 160dp animated icon
│         │     ICON]       │         │
│         │                 │         │
│         └─────────────────┘         │
│                                     │
│         (voice plays automatically) │
│                                     │
│                                     │
│      ┌──────────────────────┐       │
│      │   📞 Hospital call   │       │ <- ONE primary action button
│      └──────────────────────┘       │
│                                     │
│      [🎤 Phir bolen]                │ <- Re-record mic
└─────────────────────────────────────┘
```

- Voice plays the moment the screen appears, no tap required.
- Action button uses an icon + minimal label in user's language.
- The mic button (smaller, 120dp) sits at bottom for follow-up queries.

---

## 5. Voice & Audio Design

### 5.1 Voice Persona — "Saroja"
- Warm, mid-40s woman's voice — chosen via user research as most trusted across regions.
- Pace: 150 words/min (10% slower than urban news anchors).
- ElevenLabs cloned voice for primary languages.
- Google Wavenet voice as fallback.

### 5.2 Sound Cues
- **Tap mic:** soft chime (440 Hz, 80 ms).
- **Recording start:** gentle "tin" bell.
- **Reply incoming:** subtle "ding".
- **Error:** soft "boop", never harsh.
- Volume normalized to LUFS −16 across all cues.

### 5.3 Voice Prompts (sample, Hindi)
| State | Prompt |
|-------|--------|
| First run | "Namaste, BolKe mein swagat hai. Mic dabakar bolen." |
| Listening | "Sun raha hoon..." |
| Thinking | "Ek pal, soch raha hoon..." |
| Failure | "Maaf kijiye, dobara bolen." |

---

## 6. Animation & Motion

- Lottie powered, **always under 50 KB per asset**.
- Motion duration: 250–400 ms for micro-interactions, 600–1200 ms for transitions.
- Easing: cubic-bezier(0.19, 1, 0.22, 1) — confident, not bouncy.
- Reduce-motion setting respected (Android system).

---

## 7. Accessibility

| Need | Implementation |
|------|----------------|
| Vision-impaired | Voice-first design already covers this; TalkBack tested on every screen |
| Motor difficulty | 64dp minimum tap target; long-press alternative for all swipes |
| Hearing-impaired | Every voice reply also shown as large icon + brief regional-script subtitle (≥24sp) |
| Cognitive load | Maximum 1 decision per screen |
| Outdoor sun | Cream background + bold contrast tested at 100,000 lux |

---

## 8. Onboarding

The first launch must take **<60 seconds** end to end.

1. App opens → friendly female voice in detected system language: "Namaste! Phone number bolen ya likhen."
2. User speaks number (or types, fallback) → STT captures.
3. OTP arrives → voice reads it: "Aapka code hai 4-2-3-9, daalein ya bolen."
4. User confirms → home screen appears with a pulsing mic and a 5-sec animated tutorial: hand presses mic, speaks, reply icon appears. Loop is silent.
5. First mic press triggers a one-time voice tip: "Apni baat hindi, kannada, ya tamil mein bolen."

After this, no further tutorials ever.

---

## 9. Empty, Error, and Edge States

- **No internet:** large WiFi-off icon + voice "Internet nahi hai, baad mein dobara bolen." Cached recent queries still play.
- **STT couldn't hear:** "Saaf nahi suna, dobara bolen" + gentle re-prompt.
- **Claude unknown intent:** soft fallback icon + "Yeh main abhi nahi samajh paaya. Helpline number bhejta hoon" + auto-SMS with toll-free number.
- **Action takes long:** "Aapka kaam shuru ho gaya, SMS aayega" + immediate return to home.

---

## 10. Brand & Naming

- **Name:** बोलके / BolKe — literally "by speaking".
- **Logo:** stylized speech bubble with a saffron mic inside, rounded corners.
- **Tagline (Hindi):** "Bolo, ho jayega." (Speak, it'll be done.)
- **Tone:** warm, respectful, never condescending. Uses "aap" (formal you), never "tu".

---

## 11. Design Deliverables

| Artefact | Tool | Status |
|----------|------|--------|
| Wireframes | Figma | Sprint 1 |
| Hi-fi mockups (all 9 screens) | Figma | Sprint 2 |
| Lottie icon set (12 icons) | LottieFiles | Sprint 2 |
| Voice persona recording | ElevenLabs | Sprint 3 |
| Usability test in 3 villages | In-person | Sprint 4 |

---

## 12. Open Design Questions

1. Should "Recent queries" appear on home, or does it intimidate first-time users?
2. Female voice persona — same across all languages or region-specific?
3. How do we visually represent currency safely (₹ icon or actual notes)?
4. Should the mic button live at the bottom (thumb-friendly) instead of center?
