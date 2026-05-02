/* BolKe Home Screen
 * design.md §4.1 — Giant mic button, center of screen
 * One giant mic button — FR-1.1 (≥40% of screen)
 * Recent queries as icons (optional) — design.md §4.1
 */

import React, { useEffect, useState } from 'react';
import { MicButton } from '../components/MicButton';
import { PulseRing } from '../components/PulseRing';
import { ICON_MAP } from '../utils/constants';
import { LanguageSelector } from '../components/LanguageSelector';

export function HomeScreen({ onStartRecording, onOpenImage, onOpenChat, recentQueries, isOnline }) {
  const [showHint, setShowHint] = useState(true);
  const [selectedLang, setSelectedLang] = useState(
    localStorage.getItem('bolke_last_language') ?? 'hi'
  );

  const handleLangChange = (code) => {
    setSelectedLang(code);
    localStorage.setItem('bolke_last_language', code);
  };

  // Hide hint after first successful query — design.md §4.1
  useEffect(() => {
    const hasUsedBefore = localStorage.getItem('bolke_used');
    if (hasUsedBefore) setShowHint(false);
  }, []);

  return (
    <div className="screen screen-enter" id="screen-home">
      {/* Logo */}
      <div style={{ position: 'absolute', top: '48px', zIndex: 15 }}>
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
          zIndex: 15,
        }}>
          <span>📡</span> Offline
        </div>
      )}

      {/* Language selector — positioned above mic */}
      <div style={{
        position: 'absolute',
        top: '120px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 15,
        width: '100%',
        maxWidth: '380px',
        padding: '0 16px',
      }}>
        <LanguageSelector current={selectedLang} onChange={handleLangChange} />
      </div>

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
        <p className="label-text" style={{ marginTop: '24px', zIndex: 15 }}>
          🎤 Mic dabakar bolen
        </p>
      )}

      {/* Bottom bar: Document, Recent, Chat */}
      <div style={{
        position: 'absolute',
        bottom: '32px',
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 20,
      }}>
        {/* Document upload button */}
        <button
          onClick={() => onOpenImage?.()}
          aria-label="Upload document"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            border: 'none',
            background: 'var(--color-surface)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
            fontSize: '28px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
          }}
        >
          📄
        </button>

        {/* Recent queries as icons */}
        <div style={{
          display: 'flex',
          gap: '20px',
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
                <span style={{ fontSize: '28px' }}>{iconData.emoji}</span>
                <span style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                }}>{iconData.label}</span>
              </div>
            );
          })}
        </div>

        {/* Chat button */}
        <button
          onClick={() => onOpenChat?.()}
          aria-label="Open chat"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            border: 'none',
            background: 'var(--color-surface)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
            fontSize: '28px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
          }}
        >
          💬
        </button>
      </div>
    </div>
  );
}
