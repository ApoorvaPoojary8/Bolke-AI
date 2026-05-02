/* BolKe Action Button Component
 * ≥64dp touch target — design.md §2.4
 * Single "Do it" button with icon — FR-5.1
 */

import React from 'react';

export function ActionButton({ label, icon, onClick, variant = 'primary', disabled }) {
  const className = [
    'action-button',
    variant === 'error' ? 'error' : '',
    disabled ? 'opacity-50' : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      id={`action-button-${variant}`}
      className={className}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={label}
    >
      {icon && <span style={{ fontSize: '28px' }}>{icon}</span>}
      <span>{label}</span>
    </button>
  );
}
