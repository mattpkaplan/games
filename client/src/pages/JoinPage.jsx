import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { usePlayer, setPlayer } from '../hooks/usePlayer.js';
import './JoinPage.css';

export default function JoinPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { player, loading: playerLoading } = usePlayer();
  const [session, setSession] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinFor, setShowPinFor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState(false);

  const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  useEffect(() => {
    Promise.all([
      api.get(`/api/sessions/${token}`),
      api.get('/api/players'),
    ])
      .then(([s, players]) => {
        if (s.status !== 'pending') {
          if (s.status === 'active') navigate(`/game/${token}`);
          else setError(`This invite is ${s.status}.`);
          return;
        }
        setSession(s);
        // Show all players except Player A
        setAllPlayers(players.filter((p) => p.id !== s.player_a_id));
        // Pre-select current logged-in player if they're not Player A
        if (player && player.id !== s.player_a_id) {
          setSelectedPlayerId(player.id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  function handleSelectPlayer(p) {
    setSelectedPlayerId(p.id);
    setShowPinFor(p.id);
    setPin('');
    setPinError('');
  }

  function handleDigit(d) {
    if (d === '⌫') setPin((prev) => prev.slice(0, -1));
    else if (pin.length < 4) setPin((prev) => prev + d);
  }

  async function handleAccept() {
    if (!selectedPlayerId) return;
    setResponding(true);
    setPinError('');
    try {
      // Log in as the selected player first (verify PIN)
      const loggedIn = await api.post(`/api/players/${selectedPlayerId}/login`, { pin });
      setPlayer(loggedIn);
      // Then accept the session
      await api.patch(`/api/sessions/${token}/accept`, { playerBId: selectedPlayerId });
      navigate(`/game/${token}`);
    } catch (err) {
      if (err.status === 401) {
        setPinError('Wrong PIN — try again!');
        setPin('');
      } else {
        setError(err.message);
      }
      setResponding(false);
    }
  }

  async function handleDecline() {
    setResponding(true);
    try {
      await api.patch(`/api/sessions/${token}/decline`, { playerBId: selectedPlayerId });
    } catch { /* ignore */ }
    navigate('/');
  }

  if (loading || playerLoading) return <div className="loading">Loading...</div>;
  if (error) return (
    <div className="page" style={{ alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
      <div style={{ fontSize: '4rem' }}>😕</div>
      <p style={{ color: 'var(--color-muted)' }}>{error}</p>
      <button className="btn btn-primary" onClick={() => navigate('/')}>Go Home</button>
    </div>
  );

  const selectedPlayer = allPlayers.find((p) => p.id === selectedPlayerId);

  return (
    <div className="page join-page">
      {/* Inviter info */}
      <div className="join-inviter">
        <div className="join-avatar-wrap">
          {session?.player_a_avatar ? (
            <img src={session.player_a_avatar} alt={session.player_a_name} className="join-avatar" />
          ) : (
            <div className="join-initials">
              {session?.player_a_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)}
            </div>
          )}
        </div>
        <h2 className="join-inviter-name">{session?.player_a_name}</h2>
        <p className="join-game-label">wants to play</p>
        <div className="join-game-name">🪨📄✂️ Rock, Paper, Scissors!</div>
      </div>

      {/* Who are you? */}
      {allPlayers.length > 0 && (
        <div className="join-who-section">
          <p className="join-who-label">Who are you?</p>
          <div className="join-player-grid">
            {allPlayers.map((p) => {
              const initials = p.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
              return (
                <button
                  key={p.id}
                  className={`join-player-btn ${selectedPlayerId === p.id ? 'join-player-btn--selected' : ''}`}
                  onClick={() => handleSelectPlayer(p)}
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.name} className="join-player-avatar" />
                  ) : (
                    <div className="join-player-initials">{initials}</div>
                  )}
                  <span className="join-player-name">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PIN entry */}
      {showPinFor && selectedPlayerId && (
        <div className="join-pin-section">
          <p className="join-pin-label">Enter your PIN, {selectedPlayer?.name}:</p>
          <div className="join-pin-dots">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={`join-pin-dot ${i < pin.length ? 'join-pin-dot--filled' : ''}`} />
            ))}
          </div>
          <div className="join-pin-pad">
            {DIGITS.map((d, i) => (
              <button
                key={i}
                type="button"
                className={`join-pin-key ${d === '' ? 'join-pin-key--empty' : ''}`}
                onClick={() => d !== '' && handleDigit(d)}
                disabled={d === ''}
              >
                {d}
              </button>
            ))}
          </div>
          {pinError && <div className="error-msg">{pinError}</div>}
        </div>
      )}

      {/* Accept / Decline */}
      <div className="join-buttons">
        <button
          className="btn join-yes-btn"
          onClick={handleAccept}
          disabled={responding || !selectedPlayerId || pin.length < 4}
          aria-label="Yes, let's play!"
        >
          <span className="join-btn-icon">✅</span>
          <span>Yes! Let's Play!</span>
        </button>

        <button
          className="btn join-no-btn"
          onClick={handleDecline}
          disabled={responding}
          aria-label="No thanks, maybe later"
        >
          <span className="join-btn-icon">😴</span>
          <span>Maybe Later</span>
        </button>
      </div>
    </div>
  );
}
