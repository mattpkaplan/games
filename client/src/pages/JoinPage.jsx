import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import './JoinPage.css';

export default function JoinPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [session,   setSession]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    api.get(`/api/sessions/${token}`)
      .then((s) => {
        if (s.status === 'active') { navigate(`/game/${token}`); return; }
        if (s.status !== 'pending') { setError(`This invite is ${s.status}.`); return; }
        setSession(s);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    setResponding(true);
    try {
      // playerBId already stored on session at invite creation time
      await api.patch(`/api/sessions/${token}/accept`, {});
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

      {/* Big two-button choice */}
      <div className="join-buttons">
        <button
          className="btn join-yes-btn"
          onClick={handleAccept}
          disabled={responding}
        >
          <span className="join-btn-icon">✅</span>
          <span>Let's Play, {session?.player_b_name?.split(' ')[0] || 'Me'}!</span>
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
