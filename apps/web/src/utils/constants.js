/* BolKe Constants — sourced from design.md and Model_&_API.md */

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Use demo mode when no backend is configured
export const DEMO_MODE = !import.meta.env.VITE_API_BASE_URL;

// Colors — design.md §2.1
export const COLORS = {
  primary: '#FF7A29',
  primaryDark: '#E5651E',
  secondary: '#0E8C5B',
  background: '#FFF8EE',
  surface: '#FFFFFF',
  text: '#1F1F1F',
  error: '#D9342B',
  disabled: '#9C9384',
};

// Allowed intents — Model_&_API.md §2.2
export const INTENTS = [
  'ration', 'hospital', 'bank', 'transport',
  'pension', 'document', 'scheme_eligibility', 'unknown',
];

// Icon mapping — design.md §2.3
export const ICON_MAP = {
  hospital: { emoji: '🏥', label: 'Hospital' },
  ration: { emoji: '🛍️', label: 'Ration' },
  bank: { emoji: '💰', label: 'Bank' },
  transport: { emoji: '🚌', label: 'Transport' },
  pension: { emoji: '👴', label: 'Pension' },
  document: { emoji: '📄', label: 'Document' },
  phone: { emoji: '📞', label: 'Phone' },
  unknown: { emoji: '❓', label: 'Help' },
};

// Action type labels (Hindi defaults)
export const ACTION_LABELS = {
  call: '📞 Call karein',
  link: '🔗 Kholein',
  sms: '💬 SMS bhejein',
};

// Recording constraints — PRD FR-1.5
export const MAX_RECORDING_SECONDS = 15;

// App states (screen state machine)
export const STATES = {
  HOME:         'home',
  LISTENING:    'listening',
  THINKING:     'thinking',
  REPLY:        'reply',
  ACTION:       'action',
  FAILURE:      'failure',
  IMAGE:        'image',
  IMAGE_REPLY:  'image_reply',
  CHAT:         'chat',
};

// Demo responses for when backend is not available
export const DEMO_RESPONSES = {
  default: {
    request_id: 'demo_001',
    transcript: 'mera ration card kab aayega',
    language: 'hi',
    reply_text: 'Aapka ration card 5 din mein aayega. Apne naye ration card ke liye apne block office mein samprak karein.',
    reply_audio_url: null,
    intent: 'ration',
    icon: 'ration',
    action: {
      type: 'call',
      label: 'Helpline call karein',
      url: 'tel:1967',
    },
    latency_ms: 1800,
  },
  hospital: {
    request_id: 'demo_002',
    transcript: 'pass mein hospital dikhao',
    language: 'hi',
    reply_text: 'Aapke paas 2 sarkari hospital hain. Sabse nazdeeki PHC 3 kilometre door hai.',
    reply_audio_url: null,
    intent: 'hospital',
    icon: 'hospital',
    action: {
      type: 'call',
      label: 'Hospital call karein',
      url: 'tel:108',
    },
    latency_ms: 2100,
  },
  pension: {
    request_id: 'demo_003',
    transcript: 'mujhe pension chahiye',
    language: 'hi',
    reply_text: 'Aap Vridha Pension Yojana ke liye eligible ho sakte hain. Aapki umra kitni hai?',
    reply_audio_url: null,
    intent: 'pension',
    icon: 'pension',
    action: null,
    latency_ms: 1500,
  },
  bank: {
    request_id: 'demo_004',
    transcript: 'mera balance batao',
    language: 'hi',
    reply_text: 'Aapke account mein ₹12,450 hain. Pichla transaction ₹500 tha.',
    reply_audio_url: null,
    intent: 'bank',
    icon: 'bank',
    action: null,
    latency_ms: 1900,
  },
};
