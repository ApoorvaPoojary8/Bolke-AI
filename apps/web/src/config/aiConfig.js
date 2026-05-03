// Centralized AI provider configuration
// This avoids hardcoding secret names in multiple places

export const AI_CONFIG = {
  groq: {
    hasKey: !!import.meta.env.VITE_GROQ_API_KEY,
    get key() {
      return import.meta.env.VITE_GROQ_API_KEY;
    }
  },
  deepgram: {
    hasKey: !!import.meta.env.VITE_DEEPGRAM_API_KEY,
    get key() {
      return import.meta.env.VITE_DEEPGRAM_API_KEY;
    }
  },
  elevenlabs: {
    hasKey: !!import.meta.env.VITE_ELEVENLABS_API_KEY,
    get key() {
      return import.meta.env.VITE_ELEVENLABS_API_KEY;
    }
  },
  cartesia: {
    hasKey: !!import.meta.env.VITE_CARTESIA_API_KEY,
    get key() {
      return import.meta.env.VITE_CARTESIA_API_KEY;
    }
  },
  gemini: {
    hasKey: !!import.meta.env.VITE_GEMINI_API_KEY,
    get key() {
      return import.meta.env.VITE_GEMINI_API_KEY;
    }
  },
  nvidia: {
    hasKey: !!import.meta.env.VITE_NVIDIA_API_KEY,
    get key() {
      return import.meta.env.VITE_NVIDIA_API_KEY;
    },
    get base() {
      return import.meta.env.VITE_NVIDIA_BASE_URL;
    },
    get model() {
      return import.meta.env.VITE_NVIDIA_VISION_MODEL;
    }
  },
  livekit: {
    hasKey: !!import.meta.env.VITE_LIVEKIT_URL,
    get url() {
      return import.meta.env.VITE_LIVEKIT_URL;
    }
  }
};
