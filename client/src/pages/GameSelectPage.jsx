import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { usePlayer } from '../hooks/usePlayer.js';
import './GameSelectPage.css';

const GAMES = [
  { id: 'rps', name: 'Rock, Paper, Scissors', emoji: '🪨📄✂️', description: 'First to 3 stars wins!' },
  // More games will appear here later
];

export default function GameSelectPage() {
  const { opponentId } = useParams();
  const navigate = useNavigate();
  const { player } = usePlayer();
  const [opponent, setOpponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/players')
      .then((players) => {
        const opp = players.find((p) => String(p.id) === String(opponentId));
        if (!opp) navigate('/');
        setOpponent(opp);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [opponentId]);

  async function selectGame(gameId) {
    if (!player) return navigate('/');
    setCreating(true);
    setError('');
    try {
      const { token } = await api.post('/api/sessions', {
        playerAId: player.id,
        playerBId: opponentId,
        gameType: gameId,
      });
      navigate(`/share/${token}`, { state: { opponent } });
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page game-select-page">
      <button className="back-btn" onClick={() => navigate('/')}>← Back</button>

      <div className="game-select-opponent">
        <div className="game-select-avatar-wrap">
          {opponent?.avatar_url ? (
            <img src={opponent.avatar_url} alt={opponent.name} className="game-select-avatar" />
          ) : (
            <div className="game-select-initials">
              {opponent?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)}
            </div>
          )}
        </div>
        <h2 className="game-select-vs">Play with <strong>{opponent?.name}</strong>!</h2>
      </div>

      <p className="game-select-hint">Pick a game 👇</p>

      <div className="game-select-list">
        {GAMES.map((game) => (
          <button
            key={game.id}
            className="game-option-btn"
            onClick={() => selectGame(game.id)}
            disabled={creating}
          >
            <span className="game-option-emoji">{game.emoji}</span>
            <div className="game-option-info">
              <span className="game-option-name">{game.name}</span>
              <span className="game-option-desc">{game.description}</span>
            </div>
            <span className="game-option-arrow">▶</span>
          </button>
        ))}
      </div>

      {error && <div className="error-msg">{error}</div>}
      {creating && <div className="loading" style={{ padding: 16 }}>Creating game...</div>}
    </div>
  );
}
