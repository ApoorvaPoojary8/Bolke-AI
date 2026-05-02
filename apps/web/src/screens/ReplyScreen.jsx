/* BolKe Reply Screen
 * design.md §4.3 — Big icon + voice playback + optional action button
 * Voice plays automatically — no tap required
 * Mic button (smaller, 120dp) at bottom for follow-up queries
 */

import React from 'react';
import { ReplyIcon } from '../components/ReplyIcon';
import { ActionButton } from '../components/ActionButton';
import { MicButtonSmall } from '../components/MicButton';
import { ACTION_LABELS, ICON_MAP } from '../utils/constants';

// Back arrow SVG
const BackArrow = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M15 19l-7-7 7-7" stroke="#1F1F1F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function ReplyScreen({ response, onAction, onSpeakAgain, onBack, isPlaying }) {
  if (!response) return null;

  const { icon, reply_text, action } = response;
  const iconData = ICON_MAP[icon] || ICON_MAP.unknown;

  // Get action label
  const actionLabel = action
    ? (action.label || ACTION_LABELS[action.type] || 'Action')
    : null;

  const actionIcon = action?.type === 'call' ? '📞'
    : action?.type === 'link' ? '🔗'
    : action?.type === 'sms' ? '💬'
    : '▶️';

  return (
    <div className="screen screen-enter" id="screen-reply"
      style={{ justifyContent: 'flex-start', paddingTop: '80px', paddingBottom: '160px' }}>
      {/* Back button — design.md §4.3 */}
      <button className="back-button" onClick={onBack} aria-label="Go back">
        <BackArrow />
      </button>

      {/* Reply icon — 160dp animated — design.md §4.3 */}
      <ReplyIcon icon={icon} size={140} />

      {/* Icon label in regional script — design.md FR-4.3 */}
      <p className="icon-label">{iconData.label}</p>

      {/* Audio playing indicator */}
      {isPlaying && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '8px',
          color: 'var(--color-primary)',
          fontSize: 'var(--font-size-label)',
          fontWeight: 600,
        }}>
          <span>🔊</span>
          Playing...
        </div>
      )}

      {/* Reply text as subtle subtitle — design.md §7 hearing-impaired */}
      <p style={{
        fontSize: '20px',
        color: 'var(--color-text-secondary)',
        textAlign: 'center',
        maxWidth: '320px',
        marginTop: '16px',
        lineHeight: 1.5,
      }}>
        {reply_text}
      </p>

      {/* Action button — FR-5.1 */}
      {action && (
        <div style={{ marginTop: '28px' }}>
          <ActionButton
            label={actionLabel}
            icon={actionIcon}
            onClick={() => onAction(action)}
          />
        </div>
      )}

      {/* Re-record mic — design.md §4.3, fixed at bottom */}
      <div style={{
        position: 'fixed',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        zIndex: 20,
      }}>
        <MicButtonSmall onClick={onSpeakAgain} />
        <span style={{
          fontSize: '16px',
          color: 'var(--color-text-secondary)',
          fontWeight: 600,
        }}>
          🎤 Phir bolen
        </span>
      </div>
    </div>
  );
}
