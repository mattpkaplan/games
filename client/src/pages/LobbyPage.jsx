import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { usePlayer, setPlayer } from '../hooks/usePlayer.js';
import { socket } from '../socket.js';
import PlayerCard from '../components/PlayerCard.jsx';
import AvailabilityToggle from '../components/AvailabilityToggle.jsx';
import './LobbyPage.css';

// Login modal component
function LoginModal({ players, onLogin }) {
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  function handleDigit(d) {
    if (d === '⌫') setPin((p) => p.slice(0, -1));
    else if (pin.length < 4) setPin((p) => p + d);
  }

  async function handleLogin() {
    if (!selectedId) return setError('Pick your name first');
    if (pin.length !== 4) return setError('Enter your 4-digit PIN');
    setLoading(true);
    setError('');
    try {
      const player = await api.post(`/api/players/${selectedId}/login`, { pin });
      onLogin(player);
    } catch (err) {
      setError('Wrong PIN — try again!');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-overlay">
      <div className="login-modal">
        <h2 className="login-title">Who are you? 👋</h2>

        <div className="login-player-list">
          {players.map((p) => {
            const initials = p.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
            return (
              <button
                key={p.id}
                className={`login-player-btn ${selectedId == p.id ? 'login-player-btn--selected' : ''}`}
                onClick={() => { setSelectedId(p.id); setPin(''); setError(''); }}
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.name} className="login-player-avatar" />
                ) : (
                  <div className="login-player-initials">{initials}</div>
                )}
                <span className="login-player-name">{p.name}</span>
              </button>
            );
          })}
        </div>

        {selectedId && (
          <>
            <p className="login-pin-hint">Enter your PIN:</p>
            <div className="pin-display" style={{ justifyContent: 'center', display: 'flex', gap: 16, marginBottom: 12 }}>
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: '3px solid var(--color-primary)',
                  background: i < pin.length ? 'var(--color-primary)' : 'transparent',
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>
            <div className="pin-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
              {DIGITS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  className={`pin-key ${d === '' ? 'pin-key--empty' : ''}`}
                  onClick={() => d !== '' && handleDigit(d)}
                  disabled={d === ''}
                  style={{ height: 56, border: '2px solid #e5e7eb', borderRadius: 12, background: 'white', fontSize: '1.2rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {d}
                </button>
              ))}
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button className="btn btn-primary btn-full" onClick={handleLogin} disabled={loading}>
              {loading ? 'Checking...' : 'Enter 🚀'}
            </button>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.85rem' }}>
            New here? Register!
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LobbyPage() {
  const navigate = useNavigate();
  const { player, loading: playerLoading } = usePlayer();
  const [players, setPlayers] = useState([]);
  const [showLogin, setShowLogin] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  useEffect(() => {
    api.get('/api/players')
      .then((data) => setPlayers(data))
      .catch(console.error)
      .finally(() => setLoadingPlayers(false));
  }, []);

  // Socket for live availability
  useEffect(() => {
    socket.connect();
    socket.emit('join_lobby');

    socket.on('availability_changed', ({ playerId, available }) => {
      setPlayers((prev) =>
        prev.map((p) => p.id === playerId ? { ...p, available: available ? 1 : 0 } : p)
      );
    });

    return () => {
      socket.off('availability_changed');
      socket.disconnect();
    };
  }, []);

  async function toggleAvailability() {
    if (!player) return;
    const newVal = !player.available;
    try {
      const updated = await api.patch(`/api/players/${player.id}/availability`, { available: newVal });
      setPlayer({ ...player, available: updated.available });
      // Also emit via socket for live update
      socket.emit('set_availability', { playerId: player.id, available: newVal });
    } catch (err) {
      console.error(err);
    }
  }

  function handlePlayerTap(opponent) {
    if (!player) {
      setShowLogin(true);
      return;
    }
    if (!opponent.available) return; // busy
    navigate(`/invite/${opponent.id}`);
  }

  function handleLoginSuccess(p) {
    setPlayer(p);
    setShowLogin(false);
  }

  if (playerLoading || loadingPlayers) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="page lobby-page">
      {showLogin && (
        <LoginModal players={players} onLogin={handleLoginSuccess} />
      )}

      <div className="lobby-header">
        <h1 className="lobby-title">👨‍👩‍👧‍👦 Family Games</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline"
            style={{ minHeight: 40, padding: '6px 14px', fontSize: '0.85rem' }}
            onClick={() => navigate('/admin')}
          >
            ⚙️ Manage
          </button>
          {!player && (
            <button className="btn btn-primary" onClick={() => setShowLogin(true)}>
              Sign In
            </button>
          )}
        </div>
      </div>

      {player && (
        <AvailabilityToggle
          available={Boolean(player.available)}
          onChange={toggleAvailability}
        />
      )}

      <p className="lobby-hint">
        {player ? 'Tap someone to invite them to play!' : 'Sign in to invite someone to play!'}
      </p>

      {players.length === 0 ? (
        <div className="lobby-empty">
          <p>No one registered yet!</p>
          <Link to="/register" className="btn btn-primary" style={{ marginTop: 16 }}>
            Be First! 🎉
          </Link>
        </div>
      ) : (
        <div className="lobby-grid">
          {players.map((p) => (
            <div key={p.id} className="lobby-card-wrap">
              <PlayerCard
                player={p}
                isMe={player?.id === p.id}
                onClick={() => handlePlayerTap(p)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="lobby-footer">
        <Link to="/register" className="btn btn-outline" style={{ marginTop: 'auto' }}>
          + Add Family Member
        </Link>
        {player && (
          <button className="btn btn-outline" style={{ marginTop: 8, fontSize: '0.85rem' }}
            onClick={() => navigate(`/profile/${player.id}/edit`)}>
            ✏️ Edit My Profile
          </button>
        )}
      </div>
    </div>
  );
}
