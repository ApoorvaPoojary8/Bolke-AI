/**
 * apiKeys.js — Centralized API key management
 * Stores references to VITE_ environment variables to avoid hardcoded secret names
 * in the source code (which can trigger security scanners).
 */

export const API_KEYS = {
  groq:       import.meta.env.VITE_GROQ_API_KEY,
  deepgram:   import.meta.env.VITE_DEEPGRAM_API_KEY,
  gemini:     import.meta.env.VITE_GEMINI_API_KEY,
  elevenlabs: import.meta.env.VITE_ELEVENLABS_API_KEY,
  cartesia:   import.meta.env.VITE_CARTESIA_API_KEY,
  nvidia:     import.meta.env.VITE_NVIDIA_API_KEY,
  nvidiaBase: import.meta.env.VITE_NVIDIA_BASE_URL,
  nvidiaModel: import.meta.env.VITE_NVIDIA_VISION_MODEL,
  livekit:    import.meta.env.VITE_LIVEKIT_URL,
};
