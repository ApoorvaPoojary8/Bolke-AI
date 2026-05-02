/* BolKe Home Screen
 * design.md §4.1 — Giant mic button, center of screen
 * One giant mic button — FR-1.1 (≥40% of screen)
 * Recent queries as icons (optional) — design.md §4.1
 */

import React, { useEffect, useState } from 'react';
import { MicButton } from '../components/MicButton';
import { PulseRing } from '../components/PulseRing';
import { ICON_MAP } from '../utils/constants';

export function HomeScreen({ onStartRecording, recentQueries, isOnline }) {
  const [showHint, setShowHint] = useState(true);

  // Hide hint after first successful query — design.md §4.1
  useEffect(() => {
    const hasUsedBefore = localStorage.getItem('bolke_used');
    if (hasUsedBefore) setShowHint(false);
  }, []);

  return (
    <div className="screen screen-enter" id="screen-home">
      {/* Logo */}
      <div style={{ position: 'absolute', top: '48px' }}>
        <div className="logo">BolKe</div>
        <div className="logo-subtitle" style={{ textAlign: 'center' }}>बोलो, हो जाएगा</div>
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div style={{
          position: 'absolute',
          top: '100px',
          background: 'var(--color-error-light)',
          color: 'var(--color-error)',
          padding: '8px 20px',
          borderRadius: '20px',
          fontSize: 'var(--font-size-label)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>📡</span> Offline
        </div>
      )}

      {/* Pulse rings */}
      <PulseRing active={true} count={3} />

      {/* Main mic button — 240dp, center of screen */}
      <MicButton
        isListening={false}
        onPress={onStartRecording}
        disabled={false}
      />

      {/* Hint text — shown once, then hidden — design.md §4.1 */}
      {showHint && (
        <p className="label-text" style={{ marginTop: '24px' }}>
          🎤 Mic dabakar bolen
        </p>
      )}

      {/* Recent queries as icons — design.md §4.1 */}
      {recentQueries.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '48px',
          display: 'flex',
          gap: '24px',
          alignItems: 'center',
        }}>
          {recentQueries.slice(0, 2).map((q, i) => {
            const iconData = ICON_MAP[q.icon] || ICON_MAP.unknown;
            return (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                opacity: 0.6,
              }}>
                <span style={{ fontSize: '32px' }}>{iconData.emoji}</span>
                <span style={{
                  fontSize: '14px',
                  color: 'var(--color-text-secondary)',
                }}>{iconData.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
