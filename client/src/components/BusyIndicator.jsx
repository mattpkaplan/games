import React from 'react';
import './BusyIndicator.css';

export default function BusyIndicator({ playerName, onClose }) {
  return (
    <div className="busy-overlay">
      <div className="busy-card">
        <div className="busy-moon">🌙</div>
        <div className="busy-zzz">
          <span style={{ animationDelay: '0s' }}>Z</span>
          <span style={{ animationDelay: '0.3s' }}>Z</span>
          <span style={{ animationDelay: '0.6s' }}>Z</span>
        </div>
        <h2 className="busy-title">{playerName || 'They'}</h2>
        <p className="busy-subtitle">is busy right now 😴</p>
        <p className="busy-subtitle">Maybe try again later!</p>
        <button className="btn btn-primary btn-xl" onClick={onClose} style={{ marginTop: 24 }}>
          OK 👍
        </button>
      </div>
    </div>
  );
}
