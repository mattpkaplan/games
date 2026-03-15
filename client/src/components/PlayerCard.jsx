import React from 'react';
import './PlayerCard.css';

export default function PlayerCard({ player, onClick, isMe }) {
  const initials = player.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const available = Boolean(player.available);

  return (
    <button
      className={`player-card ${!available ? 'player-card--busy' : ''} ${isMe ? 'player-card--me' : ''}`}
      onClick={onClick}
      disabled={isMe}
      aria-label={`${player.name}, ${available ? 'available' : 'busy'}`}
    >
      <div className="player-card__avatar-wrap">
        {player.avatar_url ? (
          <img
            src={player.avatar_url}
            alt={player.name}
            className="player-card__avatar"
          />
        ) : (
          <div className="player-card__initials">{initials}</div>
        )}
        <span className={`player-card__badge ${available ? 'player-card__badge--on' : 'player-card__badge--off'}`} />
      </div>
      <span className="player-card__name">{isMe ? `${player.name} (You)` : player.name}</span>
      {!available && <span className="player-card__busy-label">Busy</span>}
    </button>
  );
}
