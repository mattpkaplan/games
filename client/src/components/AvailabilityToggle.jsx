import React from 'react';
import './AvailabilityToggle.css';

export default function AvailabilityToggle({ available, onChange }) {
  return (
    <button
      className={`avail-toggle ${available ? 'avail-toggle--on' : 'avail-toggle--off'}`}
      onClick={() => onChange(!available)}
      aria-label={available ? 'You are available. Tap to go busy.' : 'You are busy. Tap to go available.'}
    >
      <span className="avail-toggle__icon">{available ? '🟢' : '🌙'}</span>
      <span className="avail-toggle__label">
        {available ? "I'm ready to play!" : "I'm busy"}
      </span>
    </button>
  );
}
