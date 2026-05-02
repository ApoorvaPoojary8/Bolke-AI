/* BolKe Mic Button Component
 * 240dp pulsing mic button — design.md §2.4, §4.1
 * Center of screen, voice-first CTA
 */

import React from 'react';

// Microphone SVG icon
const MicIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
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
      <MicIcon />
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
      <MicIcon />
    </button>
  );
}
