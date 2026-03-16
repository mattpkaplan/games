import React from 'react';
import './AvailabilityToggle.css';

export default function AvailabilityToggle({ available, onChange, player, onEdit }) {
  const initials = player?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="avail-bar">
      {/* Avatar */}
      <div className="avail-bar__avatar">
        {player?.avatar_url
          ? <img src={player.avatar_url} alt={player.name} className="avail-bar__avatar-img" />
          : <div className="avail-bar__initials">{initials}</div>
        }
      </div>

      {/* Toggle pill */}
      <button
        className={`avail-bar__toggle ${available ? 'avail-bar__toggle--on' : 'avail-bar__toggle--off'}`}
        onClick={() => onChange(!available)}
        aria-label={available ? 'Tap to go busy' : 'Tap to go available'}
      >
        <span className="avail-bar__toggle-knob" />
        <span className="avail-bar__toggle-label">
          {available ? "I'm Ready!" : "I'm Busy"}
        </span>
      </button>

      {/* Edit pencil */}
      <button className="avail-bar__edit" onClick={onEdit} title="Edit profile">
        ✏️
      </button>
    </div>
  );
}
