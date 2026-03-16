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

      {/* Segmented toggle: I'm Ready | I'm Busy */}
      <div className="avail-bar__segment">
        <button
          className={`avail-bar__seg-btn avail-bar__seg-btn--ready ${available ? 'avail-bar__seg-btn--active-ready' : ''}`}
          onClick={() => onChange(true)}
        >
          🟢 I'm Ready
        </button>
        <button
          className={`avail-bar__seg-btn avail-bar__seg-btn--busy ${!available ? 'avail-bar__seg-btn--active-busy' : ''}`}
          onClick={() => onChange(false)}
        >
          🌙 I'm Busy
        </button>
      </div>

      {/* Edit pencil */}
      <button className="avail-bar__edit" onClick={onEdit} title="Edit profile">
        ✏️
      </button>
    </div>
  );
}
