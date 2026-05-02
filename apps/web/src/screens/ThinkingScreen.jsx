/* BolKe Thinking Screen
 * design.md §5.2 — "Ek pal, soch raha hoon..."
 * Shows spinner/loading animation while AI processes
 */

import { useEffect } from 'react';

export function ThinkingScreen({ onSpeakThinking }) {
  // Play thinking voice cue on first mount — design.md §5.3
  useEffect(() => {
    if (onSpeakThinking) {
      onSpeakThinking();
    }
  }, [onSpeakThinking]);

  return (
    <div className="screen screen-enter" id="screen-thinking">
      {/* Spinner */}
      <div className="thinking-spinner" />

      {/* Thinking dots */}
      <div className="thinking-dots">
        <div className="thinking-dot" />
        <div className="thinking-dot" />
        <div className="thinking-dot" />
      </div>

      {/* Label */}
      <p className="label-text large" style={{ marginTop: '32px' }}>
        ⏳ Soch raha hoon...
      </p>
    </div>
  );
}
