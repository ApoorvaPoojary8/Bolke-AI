// BolKe QA Test Data — 74 tests, 8 layers
const LAYERS = [
  {
    id: 'L1', name: 'Unit Tests', source: 'tech_stack.md §2–3, Model_&_API.md §2.6',
    color: '#6366F1', tests: [
      { id: 'TEST-U-01', title: 'VALID full response', detail: 'Valid JSON with all fields matching ClaudeReplySchema', gate: 'Model_&_API.md §2.6: all fields present, types match' },
      { id: 'TEST-U-02', title: 'INVALID — intent not in enum', detail: 'Input with intent="water_supply" must fail zod validation', gate: 'Enum: ration|hospital|bank|transport|pension|document|scheme_eligibility|unknown' },
      { id: 'TEST-U-03', title: 'INVALID — reply too long', detail: 'Reply with 201+ characters must fail z.string().max(200)', gate: 'Model_&_API.md §2.6: z.string().max(200)' },
      { id: 'TEST-U-04', title: 'INVALID — confidence out of range', detail: 'confidence=1.5 must fail z.number().min(0).max(1)', gate: 'Model_&_API.md §2.6' },
      { id: 'TEST-U-05', title: 'VALID — action_url is null', detail: 'Nullable action_url should pass validation', gate: 'Model_&_API.md §2.6: z.string().nullable()' },
      { id: 'TEST-U-06', title: 'INVALID — language not in set', detail: 'language="gu" (Gujarati) not in MVP launch set', gate: 'Model_&_API.md §2.2: hi|kn|ta|te|bn|mr|en only' },
      { id: 'TEST-U-07', title: 'INVALID — JSON with markdown wrapper', detail: 'Parser must strip ```json fences before parsing', gate: 'Model_&_API §2.2 Rule 5' },
      { id: 'TEST-U-08', title: 'RETRY LOGIC — 2 bad JSON → escalate', detail: 'Step 1: invalid→retry. Step 2: invalid→Sonnet 4.6. Step 3: valid from Sonnet→pass', gate: 'Model_&_API §2.6: 3-step fallback chain' },
      { id: 'TEST-U-09', title: 'Opus encoder output size', detail: '5 sec silence at 16kHz mono → blob < 200 KB', gate: 'Model_&_API §7.3: audio max 200 KB' },
      { id: 'TEST-U-10', title: 'Recording duration cap', detail: 'Hold mic 16+ sec → auto-stops at exactly 15 sec', gate: 'PRD §6.1 FR-1.5: max 15 seconds' },
      { id: 'TEST-U-11', title: 'Max recording enforcement', detail: 'MediaRecorder released, blob closed at 15s, no memory leak', gate: 'tech_stack §2.3' },
      { id: 'TEST-U-12', title: 'All required env vars present', detail: 'Zod-validated config: all keys present→start, any missing→refuse with clear error', gate: 'tech_stack §8.3: Doppler-managed, validated at boot' },
      { id: 'TEST-U-13', title: 'Claude API key never in client', detail: 'grep -r "sk-ant" apps/ → zero results', gate: 'Model_&_API §13, architecture §7' },
    ]
  },
  {
    id: 'L2', name: 'API Contract Tests', source: 'Model_&_API.md §7, architecture.md §3.2',
    color: '#8B5CF6', tests: [
      { id: 'TEST-A-01', title: 'POST /v1/auth/otp — happy path', detail: 'Request: {phone:"+919876543210"} → 200 {request_id, ttl_seconds:120}', gate: 'Model_&_API §7.1' },
      { id: 'TEST-A-02', title: 'POST /v1/auth/otp — invalid phone', detail: 'Request: {phone:"notaphone"} → 400 validation error', gate: 'Fastify schema validation' },
      { id: 'TEST-A-03', title: 'POST /v1/auth/verify — correct OTP', detail: 'Returns {access_token, refresh_token, expires_in:3600}', gate: 'Model_&_API §7.2: JWT 1h' },
      { id: 'TEST-A-04', title: 'POST /v1/auth/verify — wrong OTP', detail: 'Wrong code → 401 Unauthorized', gate: 'Never issue token on bad OTP' },
      { id: 'TEST-A-05', title: 'JWT expiry enforcement', detail: 'Use token after 3601s → 401 expired', gate: 'architecture §7: JWT 1h lifetime' },
      { id: 'TEST-A-06', title: 'POST /v1/voice — happy path Hindi', detail: 'Hindi ration query → language="hi", intent="ration", latency<3000ms', gate: 'Model_&_API §7.3, PRD §7 NFR' },
      { id: 'TEST-A-07', title: 'POST /v1/voice — Kannada hospital', detail: 'Kannada hospital query → language="kn", intent="hospital"', gate: 'PRD §5 use case 2' },
      { id: 'TEST-A-08', title: 'POST /v1/voice — no auth header', detail: '→ 401 immediately, no Claude/STT call made', gate: 'architecture §7' },
      { id: 'TEST-A-09', title: 'POST /v1/voice — audio too large', detail: '210 KB blob → 413 Payload Too Large', gate: 'Model_&_API §7.3: max 200 KB' },
      { id: 'TEST-A-10', title: 'POST /v1/voice — audio too long', detail: '20 sec recording → 400 or gateway trims to 15 sec', gate: 'PRD §6.1 FR-1.5' },
      { id: 'TEST-A-11', title: 'POST /v1/voice — rate limit', detail: '61st request with same device_id → 429', gate: 'architecture §7: 60/hour/device' },
      { id: 'TEST-A-12', title: 'POST /v1/voice — unknown intent', detail: '"pizza order karo" → intent="unknown", safe fallback', gate: 'PRD §6.3 FR-3.4' },
      { id: 'TEST-A-13', title: 'POST /v1/action/ration_status', detail: '→ 200 {queued:true, estimated_seconds:30, sms_will_arrive:true}', gate: 'Model_&_API §7.4: async pattern' },
      { id: 'TEST-A-14', title: 'GET /v1/health', detail: '→ 200 {status,claude,stt,tts,n8n} each "ok"|"degraded"', gate: 'architecture §3.2' },
    ]
  },
  {
    id: 'L3', name: 'Integration Tests', source: 'architecture.md §3–4, Model_&_API.md §2–5',
    color: '#A855F7', tests: [
      { id: 'TEST-I-01', title: 'STT → Claude pipeline', detail: 'Real opus audio → Google STT transcript → Claude valid JSON. STT<800ms, Claude<800ms', gate: 'architecture §4, Model_&_API §1' },
      { id: 'TEST-I-02', title: 'Claude → TTS pipeline', detail: 'Reply text → Google Wavenet TTS → MP3 plays without error. TTS<500ms', gate: 'Model_&_API §1' },
      { id: 'TEST-I-03', title: 'Prompt caching verification', detail: '2nd identical prompt → cache_read_input_tokens > 0, ~90% cost reduction', gate: 'Model_&_API §2.3' },
      { id: 'TEST-I-04', title: 'n8n webhook integration', detail: 'Backend → n8n pds_ration_status → HMAC validated → responds <30s', gate: 'Model_&_API §8, architecture §3.5' },
      { id: 'TEST-I-05', title: 'Supabase query_logs write', detail: 'Voice query → query_logs has request_id, intent, latency_ms, NO PII', gate: 'architecture §5.1' },
      { id: 'TEST-I-06', title: 'Supabase audio TTL', detail: 'Upload audio → after 24h+1min → 404 blob deleted', gate: 'architecture §5.1' },
      { id: 'TEST-I-07', title: 'SMS confirmation dispatch', detail: 'Action trigger → MSG91 receives SMS with correct template_id, phone hashed in logs', gate: 'architecture §3.7, Model_&_API §10' },
      { id: 'TEST-I-08', title: 'DigiLocker OAuth flow', detail: 'OAuth → redirect → complete → encrypted token in Supabase (AES-256)', gate: 'architecture §7' },
    ]
  },
  {
    id: 'L4', name: 'Failure & Resilience', source: 'architecture.md §6, design.md §9',
    color: '#EC4899', tests: [
      { id: 'TEST-F-01', title: 'Google STT timeout', detail: 'STT >2s → retry once → fallback to Vosk → show error icon + voice prompt', gate: 'architecture §6, design §9' },
      { id: 'TEST-F-02', title: 'Claude API 500 error', detail: 'HTTP 500 → exponential backoff (max 2) → static fallback reply → Sentry alert', gate: 'architecture §6, Model_&_API §2.7' },
      { id: 'TEST-F-03', title: 'Claude returns invalid JSON (both retries)', detail: 'Bad JSON ×2 → escalate Sonnet 4.6 → if still fails → intent="unknown"', gate: 'Model_&_API §2.6' },
      { id: 'TEST-F-04', title: 'TTS failure', detail: 'TTS 503 → cached "please wait" audio → text icon shown, never blank screen', gate: 'architecture §6' },
      { id: 'TEST-F-05', title: 'n8n completely down', detail: 'Voice reply STILL returns (async), action queued, SMS apology sent', gate: 'architecture §6: n8n down ≠ block voice' },
      { id: 'TEST-F-06', title: 'Full network drop mid-recording', detail: 'Cut network at 2s → WiFi-off icon + voice → cached reply playable → recording saved', gate: 'architecture §6, design §9, PRD §6.6' },
      { id: 'TEST-F-07', title: 'Complete offline mode (Vosk)', detail: 'No network → Vosk STT → "saved offline" icon → queued for replay', gate: 'PRD §6.6 FR-6.3, tech_stack §2.7' },
      { id: 'TEST-F-08', title: 'Gateway region failover', detail: 'Mumbai down → load balancer routes to Singapore → no error to client', gate: 'architecture §3.2: 3-region' },
      { id: 'TEST-F-09', title: 'Rate limit recovery', detail: 'Exhaust 60/hr → wait 1hr → next request succeeds', gate: 'architecture §7: hourly window' },
    ]
  },
  {
    id: 'L5', name: 'Accessibility & Design', source: 'design.md §2–9, PRD.md §7',
    color: '#F59E0B', tests: [
      { id: 'TEST-D-01', title: 'Mic button size ≥ 240dp', detail: 'Measure mic button diameter on Home screen', gate: 'design §2.4, §4.1' },
      { id: 'TEST-D-02', title: 'Touch targets ≥ 64dp on all screens', detail: 'Every tappable element across all screens ≥ 64×64dp', gate: 'design §2.4: exceeds Material 48dp' },
      { id: 'TEST-D-03', title: 'Font size audit — no text below 24sp', detail: 'Layout Inspector: every text element ≥ 24sp', gate: 'design §2.2: body minimum 24sp' },
      { id: 'TEST-D-04', title: 'Colour contrast ratio ≥ 4.5:1', detail: 'Saffron on Cream, Error on White — all pass WCAG AA', gate: 'PRD §7 NFR Accessibility' },
      { id: 'TEST-D-05', title: 'Voice auto-plays on Reply screen', detail: 'TTS begins without any tap required', gate: 'design §4.3' },
      { id: 'TEST-D-06', title: 'Reduce Motion respected', detail: 'Enable "Remove animations" → Lottie stops, no motion content', gate: 'design §6' },
      { id: 'TEST-D-07', title: 'TalkBack / screen reader navigation', detail: 'Navigate all screens eyes-closed, every element has content description', gate: 'design §7' },
      { id: 'TEST-D-08', title: 'Hearing-impaired mode', detail: 'Mute device → large icon shown + regional-script subtitle ≥ 24sp', gate: 'design §7' },
      { id: 'TEST-D-09', title: 'Outdoor sunlight readability', detail: 'Max brightness, 100k lux — all text and icons clearly readable', gate: 'design §7' },
      { id: 'TEST-D-10', title: 'Screen count = exactly 6 (web)', detail: 'Home, Listening, Thinking, Reply, Action, Failure', gate: 'design §3 adapted for web' },
      { id: 'TEST-D-11', title: '"Saroja" voice persona consistency', detail: 'Same warm female voice in Hindi, Kannada, Tamil replies', gate: 'design §5.1' },
      { id: 'TEST-D-12', title: 'Voice uses "aap" form, never "tu"', detail: '10 different Claude replies — zero "tu" instances', gate: 'Model_&_API §2.2 Rule 3' },
    ]
  },
  {
    id: 'L6', name: 'Security & Privacy', source: 'architecture.md §7, PRD.md §7, Model_&_API.md §13',
    color: '#EF4444', tests: [
      { id: 'TEST-S-01', title: 'TLS enforcement', detail: 'HTTP connection → refused or 301→HTTPS redirect', gate: 'architecture §7: TLS 1.3' },
      { id: 'TEST-S-02', title: 'Claude API key not in source', detail: 'grep -r "sk-ant" apps/ → zero matches', gate: 'architecture §7, Model_&_API §13' },
      { id: 'TEST-S-03', title: 'Aadhaar number never stored', detail: 'DigiLocker fetch → check all tables → NO raw Aadhaar', gate: 'architecture §5.2' },
      { id: 'TEST-S-04', title: 'Audio blob deleted after 24h', detail: 'Submit query → 24h+1min → storage path returns 404', gate: 'architecture §5.1, PRD §7' },
      { id: 'TEST-S-05', title: 'JWT is device-bound', detail: 'JWT from device A used on device B → 401', gate: 'architecture §7: device-bound refresh' },
      { id: 'TEST-S-06', title: 'n8n webhook HMAC validation', detail: 'No signature → 401. Wrong HMAC → 401', gate: 'Model_&_API §8, architecture §3.5' },
      { id: 'TEST-S-07', title: 'Rate limit per device not per IP', detail: '2 phones same WiFi → each gets own 60/hr limit', gate: 'architecture §7: per-device' },
      { id: 'TEST-S-08', title: 'No PII in Claude logs', detail: 'Query with name+phone → no stored PII in logs', gate: 'PRD §7 Privacy, architecture §5.1' },
      { id: 'TEST-S-09', title: 'DigiLocker token encryption', detail: 'Token in DB is AES-256 ciphertext, not plaintext JWT', gate: 'architecture §7' },
      { id: 'TEST-S-10', title: 'Daily spend cap $50/day', detail: 'At $40 (80%) alert fires. At $50 Claude calls blocked', gate: 'Model_&_API §2.8' },
    ]
  },
  {
    id: 'L7', name: 'Performance & Cost', source: 'architecture.md §4 & §9, PRD.md §7',
    color: '#10B981', tests: [
      { id: 'TEST-P-01', title: 'P95 latency ≤ 3s on 3G', detail: '100 queries on 3G throttle → P95 from mic release to audio playing ≤ 3000ms', gate: 'PRD §7 NFR, architecture §4' },
      { id: 'TEST-P-02', title: 'Per-component latency budget', detail: 'STT<800ms, Claude<800ms, TTS<500ms, Network<400ms — 50 queries', gate: 'Model_&_API §1' },
      { id: 'TEST-P-03', title: 'Cost per 1,000 queries ≤ $4.50', detail: '1000 real queries → aggregate Claude+STT+TTS+SMS ≤ ₹0.35/query', gate: 'architecture §9: ~$3.60/1K' },
      { id: 'TEST-P-04', title: 'Claude Haiku usage >95%', detail: 'Dashboard shows >95% Haiku, <5% Sonnet escalation', gate: 'Model_&_API §2.1' },
      { id: 'TEST-P-05', title: 'Prompt caching saving money', detail: 'cached_tokens / total_input ≥ 85%', gate: 'Model_&_API §2.3: 90% discount' },
      { id: 'TEST-P-06', title: 'Bundle size check', detail: 'Production build ≤ 500 KB gzipped (web PWA)', gate: 'PRD §6.6 FR-6.3 adapted' },
      { id: 'TEST-P-07', title: 'Low-end device performance', detail: '10 consecutive queries on 1GB RAM device — no crashes, UI responsive', gate: 'PRD §7 NFR' },
      { id: 'TEST-P-08', title: 'Uptime ≥ 99.5%', detail: '/v1/health every 60s for 7 days → max 50 min downtime/week', gate: 'PRD §7 NFR' },
    ]
  },
  {
    id: 'L8', name: 'End-to-End Journeys', source: 'PRD.md §5 & §9, design.md §4',
    color: '#FF7A29', tests: [
      { id: 'JOURNEY-1', title: 'Ration Card Status (Hindi)', detail: 'Press mic → "Mera ration card kab milega?" → Hindi reply + ration icon + action button → helpline call. Total ≤ 2 taps.',
        steps: ['App opens → home screen with mic ≥240dp','Press & hold mic → pulsing animation starts','Speak Hindi: "Mera ration card kab milega?"','Release mic → thinking animation ≤3s','Reply: Hindi voice + ration-bag Lottie icon','Action button shown → tap to call helpline','Return to home in ≤1 tap'],
        gate: 'PRD §4.1: ≤3 taps, PRD §9' },
      { id: 'JOURNEY-2', title: 'Nearest Hospital (Kannada)', detail: 'Press mic → Kannada hospital query → language="kn", intent="hospital" → map with GPS. ≤3 taps.',
        steps: ['Press mic → speak Kannada','STT returns Kannada transcript','Claude: language="kn", intent="hospital"','Reply: hospital icon + Kannada voice','Action: map/directions with GPS pin'],
        gate: 'PRD §5 use case 2' },
      { id: 'JOURNEY-3', title: 'Scheme Eligibility (Hindi)', detail: '"Mujhe pension chahiye" → 3 clarifying questions (age, gender, income) → matching scheme + helpline.',
        steps: ['Press mic → "Mujhe pension chahiye"','BolKe asks: "Aapki umar kitni hai?"','User speaks age','BolKe asks gender','BolKe asks income','Returns matching scheme + helpline (verified, not invented)'],
        gate: 'PRD §5 use case 3: max 3 questions' },
      { id: 'JOURNEY-4', title: 'DigiLocker Aadhaar (Hindi)', detail: '"Mera Aadhaar dikhao" → DigiLocker OAuth → masked Aadhaar (XXXX-XXXX-1234) read aloud.',
        steps: ['Press mic → "Mera Aadhaar dikhao"','DigiLocker OAuth initiated','User authenticates','Masked Aadhaar displayed (last 4 only)','BolKe reads masked number aloud','No direct DigiLocker call from client'],
        gate: 'architecture §5.2, §3.5' },
      { id: 'JOURNEY-5', title: 'Bank Balance (Bengali)', detail: '"Amar balance bolo" → Bengali response → spoken balance, not stored.',
        steps: ['Press mic → speak Bengali','Language detected = "bn"','Balance spoken in Bengali voice','No balance stored in any DB','Works on 2G throttled connection'],
        gate: 'PRD §5 use case 5, architecture §5.2' },
    ]
  },
];

// Production launch gate criteria
const LAUNCH_GATES = [
  { label: 'All Layer 1–3 tests: 100% PASS', check: (r) => ['L1','L2','L3'].every(l => layerAllPass(r, l)) },
  { label: 'All Layer 4 (Resilience): 100% PASS', check: (r) => layerAllPass(r, 'L4') },
  { label: 'All Layer 6 (Security): 100% PASS', check: (r) => layerAllPass(r, 'L6') },
  { label: 'TEST-D-03 Font size: PASS', check: (r) => r['TEST-D-03'] === 'pass' },
  { label: 'TEST-D-04 Contrast: PASS', check: (r) => r['TEST-D-04'] === 'pass' },
  { label: 'TEST-P-01 P95 latency ≤ 3s: PASS', check: (r) => r['TEST-P-01'] === 'pass' },
  { label: 'TEST-P-03 Cost ≤ ₹0.50/query: PASS', check: (r) => r['TEST-P-03'] === 'pass' },
  { label: 'All 5 E2E Journeys: PASS', check: (r) => layerAllPass(r, 'L8') },
  { label: 'TEST-S-02 API key not in client: PASS', check: (r) => r['TEST-S-02'] === 'pass' },
  { label: 'TEST-S-03 No Aadhaar stored: PASS', check: (r) => r['TEST-S-03'] === 'pass' },
];

function layerAllPass(results, layerId) {
  const layer = LAYERS.find(l => l.id === layerId);
  if (!layer) return false;
  return layer.tests.every(t => results[t.id] === 'pass');
}

window.BOLKE_QA_DATA = { LAYERS, LAUNCH_GATES };
