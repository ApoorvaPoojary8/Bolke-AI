/* BolKe Pulse Ring Component
 * Expanding ring animation for mic feedback
 * design.md §4.2 — pulsing with user voice amplitude
 */

import React from 'react';

export function PulseRing({ active, count = 3 }) {
  return (
    <div className="pulse-ring-container">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`pulse-ring ${active ? 'active' : ''}`}
        />
      ))}
    </div>
  );
}
