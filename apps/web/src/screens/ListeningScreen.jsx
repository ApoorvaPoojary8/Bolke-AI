/* BolKe Listening Screen
 * design.md §4.2 — Mic expands to 320dp, pulsing with amplitude
 * Background dims, waveform appears below mic
 */

import React from 'react';
import { MicButton } from '../components/MicButton';
import { PulseRing } from '../components/PulseRing';
import { WaveformVisual } from '../components/WaveformVisual';

export function ListeningScreen({ audioLevel, onStopRecording }) {
  return (
    <div className="screen" id="screen-listening">
      {/* Background dim — design.md §4.2 */}
      <div className="screen-overlay" />

      {/* Pulse rings — active with voice */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <PulseRing active={true} count={3} />

        {/* Expanded mic button — 320dp, pulsing with amplitude */}
        <MicButton
          isListening={true}
          onRelease={onStopRecording}
        />
      </div>

      {/* Label */}
      <p className="label-text" style={{
        marginTop: '24px',
        color: 'white',
        zIndex: 10,
        fontSize: '22px',
      }}>
        🎧 Sun raha hoon...
      </p>

      {/* Waveform — design.md §4.2 */}
      <div style={{ zIndex: 10, marginTop: '8px' }}>
        <WaveformVisual audioLevel={audioLevel} active={true} />
      </div>
    </div>
  );
}
