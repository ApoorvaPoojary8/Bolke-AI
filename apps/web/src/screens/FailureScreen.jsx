/* BolKe Failure Screen
 * design.md §9 — Friendly retry with voice prompt
 * "Maaf kijiye, dobara bolen" — design.md §5.3
 * Soft "boop" sound, never harsh — design.md §5.2
 */

import React, { useEffect } from 'react';
import { ActionButton } from '../components/ActionButton';
import { MicButtonSmall } from '../components/MicButton';

export function FailureScreen({ errorMessage, onRetry, onHome, onSpeakError }) {
  // Play error voice prompt on mount
  useEffect(() => {
    if (onSpeakError) {
      onSpeakError();
    }
  }, []);

  return (
    <div className="screen screen-enter" id="screen-failure">
      {/* Error icon — friendly, not scary */}
      <div style={{
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: 'var(--color-error-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '48px',
        animation: 'icon-entrance 0.6s cubic-bezier(0.19, 1, 0.22, 1)',
      }}>
        😔
      </div>

      {/* Error message */}
      <p className="label-text large" style={{
        marginTop: '24px',
        color: 'var(--color-error)',
        fontWeight: 700,
        fontSize: '24px',
      }}>
        {errorMessage || 'Maaf kijiye, dobara bolen'}
      </p>

      {/* Subtle helper text */}
      <p style={{
        fontSize: 'var(--font-size-label)',
        color: 'var(--color-text-secondary)',
        textAlign: 'center',
        marginTop: '8px',
        maxWidth: '280px',
      }}>
        Thoda paas aakar bolen, awaaz saaf aani chahiye
      </p>

      {/* Retry button */}
      <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <MicButtonSmall onClick={onRetry} />
        <span style={{
          fontSize: 'var(--font-size-label)',
          color: 'var(--color-text-secondary)',
        }}>
          🎤 Dobara bolen
        </span>
      </div>

      {/* Home button */}
      <div style={{ position: 'absolute', bottom: '48px' }}>
        <ActionButton
          label="🏠 Home"
          onClick={onHome}
          variant="primary"
        />
      </div>
    </div>
  );
}
