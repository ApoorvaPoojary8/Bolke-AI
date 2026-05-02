/* BolKe Action Confirmation Screen
 * design.md §3 screen 7 — "Aapka kaam ho gaya" + SMS preview
 * Shows success after action is triggered
 */

import { useEffect, useState } from 'react';
import { ActionButton } from '../components/ActionButton';

export function ActionScreen({ onDone }) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // Auto-confirm after 3 seconds to simulate async action
    const timer = setTimeout(() => setConfirmed(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="screen screen-enter" id="screen-action">
      {!confirmed ? (
        <>
          {/* Loading state */}
          <div className="thinking-spinner" />
          <p className="label-text large" style={{ marginTop: '24px' }}>
            Aapka kaam shuru ho gaya...
          </p>
        </>
      ) : (
        <>
          {/* Success checkmark */}
          <svg className="checkmark-circle" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="var(--color-secondary)" strokeWidth="4" opacity="0.2" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="var(--color-secondary)" strokeWidth="4"
              strokeDasharray="314" strokeDashoffset="0"
              style={{ animation: 'none' }} />
            <path className="checkmark" d="M38 62 L52 76 L82 46" />
          </svg>

          <p className="label-text large" style={{
            marginTop: '24px',
            color: 'var(--color-secondary)',
            fontSize: '26px',
            fontWeight: 700,
          }}>
            ✅ Aapka kaam ho gaya!
          </p>

          <p style={{
            fontSize: 'var(--font-size-label)',
            color: 'var(--color-text-secondary)',
            textAlign: 'center',
            marginTop: '12px',
          }}>
            📱 SMS aayega jab complete hoga
          </p>

          {/* Return to home */}
          <div style={{ marginTop: '48px' }}>
            <ActionButton
              label="🏠 Home"
              onClick={onDone}
            />
          </div>
        </>
      )}
    </div>
  );
}
