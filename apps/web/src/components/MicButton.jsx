/* BolKe Mic Button Component
 * 240dp pulsing mic button — design.md §2.4, §4.1
 * Center of screen, voice-first CTA
 * Premium mic icon with studio-quality design
 */

// Premium studio-style microphone SVG icon
const MicIcon = ({ size = 80 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
  >
    {/* Mic head — rounded capsule */}
    <rect x="28" y="10" width="24" height="34" rx="12" fill="white" />

    {/* Inner grill lines for premium look */}
    <line x1="32" y1="18" x2="48" y2="18" stroke="rgba(255,122,41,0.25)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="32" y1="23" x2="48" y2="23" stroke="rgba(255,122,41,0.25)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="32" y1="28" x2="48" y2="28" stroke="rgba(255,122,41,0.25)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="32" y1="33" x2="48" y2="33" stroke="rgba(255,122,41,0.25)" strokeWidth="1.5" strokeLinecap="round" />

    {/* Cradle arc */}
    <path
      d="M22 38C22 48.5 30 55 40 55C50 55 58 48.5 58 38"
      stroke="white"
      strokeWidth="3.5"
      strokeLinecap="round"
      fill="none"
    />

    {/* Stem */}
    <line x1="40" y1="55" x2="40" y2="66" stroke="white" strokeWidth="3.5" strokeLinecap="round" />

    {/* Base */}
    <line x1="30" y1="66" x2="50" y2="66" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

// Listening state icon — with sound waves
const MicListeningIcon = ({ size = 96 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 96 96"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0 2px 8px rgba(255,69,0,0.3))' }}
  >
    {/* Sound wave — left */}
    <path
      d="M18 36C14 40 14 52 18 56"
      stroke="rgba(255,255,255,0.5)"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
    >
      <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.2s" repeatCount="indefinite" />
    </path>
    <path
      d="M12 30C6 38 6 54 12 62"
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    >
      <animate attributeName="opacity" values="0.1;0.5;0.1" dur="1.5s" repeatCount="indefinite" />
    </path>

    {/* Sound wave — right */}
    <path
      d="M78 36C82 40 82 52 78 56"
      stroke="rgba(255,255,255,0.5)"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
    >
      <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.2s" repeatCount="indefinite" begin="0.3s" />
    </path>
    <path
      d="M84 30C90 38 90 54 84 62"
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    >
      <animate attributeName="opacity" values="0.1;0.5;0.1" dur="1.5s" repeatCount="indefinite" begin="0.3s" />
    </path>

    {/* Mic head — glowing during listen */}
    <rect x="36" y="16" width="24" height="34" rx="12" fill="white" />

    {/* Inner grill lines */}
    <line x1="40" y1="24" x2="56" y2="24" stroke="rgba(255,69,0,0.35)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="40" y1="29" x2="56" y2="29" stroke="rgba(255,69,0,0.35)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="40" y1="34" x2="56" y2="34" stroke="rgba(255,69,0,0.35)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="40" y1="39" x2="56" y2="39" stroke="rgba(255,69,0,0.35)" strokeWidth="1.5" strokeLinecap="round" />

    {/* Cradle arc */}
    <path
      d="M30 44C30 54.5 38 61 48 61C58 61 66 54.5 66 44"
      stroke="white"
      strokeWidth="3.5"
      strokeLinecap="round"
      fill="none"
    />

    {/* Stem */}
    <line x1="48" y1="61" x2="48" y2="72" stroke="white" strokeWidth="3.5" strokeLinecap="round" />

    {/* Base */}
    <line x1="38" y1="72" x2="58" y2="72" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

export function MicButton({ isListening, onPress, onRelease, disabled }) {
  const className = [
    'mic-button',
    isListening ? 'listening' : 'idle',
    disabled ? 'opacity-50' : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      id="mic-button-main"
      className={className}
      onPointerDown={disabled ? undefined : onPress}
      onPointerUp={disabled ? undefined : onRelease}
      onPointerLeave={isListening ? onRelease : undefined}
      disabled={disabled}
      aria-label={isListening ? 'Recording... release to stop' : 'Press and hold to speak'}
    >
      {isListening ? <MicListeningIcon /> : <MicIcon />}
    </button>
  );
}

export function MicButtonSmall({ onClick, disabled }) {
  return (
    <button
      id="mic-button-small"
      className="mic-button-small"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label="Speak again"
    >
      <MicIcon size={32} />
    </button>
  );
}
