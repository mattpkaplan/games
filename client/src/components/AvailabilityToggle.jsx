import React from 'react';
import './AvailabilityToggle.css';

export default function AvailabilityToggle({ available, onChange, player, onEdit }) {
  const initials = player?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className={`avail-toggle ${available ? 'avail-toggle--on' : 'avail-toggle--off'}`}>
      {/* Avatar + edit pencil */}
      <div className="avail-toggle__user" onClick={onEdit} title="Edit profile">
        {player?.avatar_url
          ? <img src={player.avatar_url} alt={player.name} className="avail-toggle__avatar" />
          : <div className="avail-toggle__initials">{initials}</div>
        }
        <span className="avail-toggle__edit">✏️</span>
      </div>

      {/* Tap to toggle availability */}
      <button
        className="avail-toggle__btn"
        onClick={() => onChange(!available)}
        aria-label={available ? 'You are available. Tap to go busy.' : 'You are busy. Tap to go available.'}
      >
        <span className={`avail-toggle__dot ${available ? 'avail-toggle__dot--on' : 'avail-toggle__dot--off'}`} />
        <span className="avail-toggle__label">
          {available ? "I'm ready to play!" : "I'm busy"}
        </span>
      </button>
    </div>
  );
}
