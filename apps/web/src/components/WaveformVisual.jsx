/* BolKe Waveform Visualizer
 * Shows voice amplitude bars during recording
 * design.md §4.2 — subtle waveform below mic
 */

import React, { useMemo } from 'react';

const BAR_COUNT = 20;

export function WaveformVisual({ audioLevel, active }) {
  const bars = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      // Create natural-looking waveform with center emphasis
      const center = BAR_COUNT / 2;
      const distFromCenter = Math.abs(i - center) / center;
      const baseHeight = active
        ? (1 - distFromCenter * 0.6) * audioLevel * 50 + 6
        : 6;
      // Add subtle randomness
      const jitter = active ? Math.random() * 8 * audioLevel : 0;
      return Math.max(6, baseHeight + jitter);
    });
  }, [audioLevel, active]);

  return (
    <div className="waveform" role="presentation">
      {bars.map((height, i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{
            height: `${height}px`,
            opacity: active ? 0.6 + audioLevel * 0.4 : 0.3,
          }}
        />
      ))}
    </div>
  );
}
