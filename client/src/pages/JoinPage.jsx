import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { usePlayer } from '../hooks/usePlayer.js';
import './JoinPage.css';

export default function JoinPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { player } = usePlayer();
  const [session,   setSession]   = useState(null);
  const [players,   setPlayers]   = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/api/sessions/${token}`),
      api.get('/api/players'),
    ])
      .then(([s, ps]) => {
        if (s.status === 'active') { navigate(`/game/${token}`); return; }
        if (s.status !== 'pending') { setError(`This invite is ${s.status}.`); return; }
        setSession(s);
        // exclude the inviter from the picker
        setPlayers(ps.filter(p => String(p.id) !== String(s.player_a_id)));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  // If already logged in, pre-select ourselves
  useEffect(() => {
    if (player && !selectedId) setSelectedId(player.id);
  }, [player?.id]);

  async function handleAccept() {
    setResponding(true);
    try {
      await api.patch(`/api/sessions/${token}/accept`, {
        playerBId: selectedId ?? null,
      });
      navigate(`/game/${token}`);
    } catch (err) {
      setError(err.message);
      setResponding(false);
    }
  }

  async function handleDecline() {
    setResponding(true);
    try {
      await api.patch(`/api/sessions/${token}/decline`, {});
    } catch { /* ignore */ }
    navigate('/');
  }

  if (loading) return <div className="loading">Loading...</div>;

  if (error) return (
    <div className="page" style={{ alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
      <div style={{ fontSize: '4rem' }}>😕</div>
      <p style={{ color: 'var(--color-muted)' }}>{error}</p>
      <button className="btn btn-primary" onClick={() => navigate('/')}>Go Home</button>
    </div>
  );

  const initials = session?.player_a_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const selectedPlayer = players.find(p => String(p.id) === String(selectedId));

  return (
    <div className="page join-page">

      {/* Inviter */}
      <div className="join-inviter">
        <div className="join-avatar-wrap">
          {session?.player_a_avatar ? (
            <img src={session.player_a_avatar} alt={session.player_a_name} className="join-avatar" />
          ) : (
            <div className="join-initials">{initials}</div>
          )}
        </div>
        <h2 className="join-inviter-name">{session?.player_a_name}</h2>
        <p className="join-game-label">wants to play</p>
        <div className="join-game-name">🪨📄✂️ Rock, Paper, Scissors!</div>
      </div>

      {/* Who are you? — compact avatar row (hidden if already logged in) */}
      {!player && (
        <div className="join-who">
          <p className="join-who-label">Who are you?</p>
          <div className="join-who-row">
            {players.map(p => {
              const ini = p.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
              const sel = String(p.id) === String(selectedId);
              return (
                <button key={p.id} className={`join-who-btn ${sel ? 'join-who-btn--sel' : ''}`}
                  onClick={() => setSelectedId(p.id)}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt={p.name} className="join-who-avatar" />
                    : <div className="join-who-initials">{ini}</div>
                  }
                  <span className="join-who-name">{p.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Big two-button choice */}
      <div className="join-buttons">
        <button
          className="btn join-yes-btn"
          onClick={handleAccept}
          disabled={responding}
        >
          <span className="join-btn-icon">✅</span>
          <span>Let's Play{selectedPlayer ? `, ${selectedPlayer.name.split(' ')[0]}!` : '!'}</span>
        </button>

        <button
          className="btn join-no-btn"
          onClick={handleDecline}
          disabled={responding}
        >
          <span className="join-btn-icon">😴</span>
          <span>Sorry, I'm Busy</span>
        </button>
      </div>

    </div>
  );
}
