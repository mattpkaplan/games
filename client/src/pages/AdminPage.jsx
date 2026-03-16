import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminPage.css';

const ADMIN_PIN = '0790';
const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function AdminPage() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  function handleDigit(d) {
    if (d === '⌫') { setPin(p => p.slice(0, -1)); setPinError(''); }
    else if (pin.length < 4) {
      const next = pin + d;
      setPin(next);
      if (next.length === 4) {
        if (next === ADMIN_PIN) {
          setAuthenticated(true);
        } else {
          setPinError('Wrong PIN — try again');
          setTimeout(() => { setPin(''); setPinError(''); }, 800);
        }
      }
    }
  }

  useEffect(() => {
    if (!authenticated) return;
    setLoading(true);
    fetch(`/api/admin/players?adminPin=${ADMIN_PIN}`)
      .then(r => r.json())
      .then(setPlayers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authenticated]);

  async function handleDelete(player) {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: ADMIN_PIN }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setPlayers(prev => prev.filter(p => p.id !== player.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="page admin-pin-page">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <div className="admin-pin-box">
          <div className="admin-pin-icon">⚙️</div>
          <h1 className="admin-pin-title">Admin Access</h1>
          <p className="admin-pin-hint">Enter the admin PIN</p>
          <div className="pin-dots">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={`pin-dot ${i < pin.length ? 'pin-dot--filled' : ''} ${pinError ? 'pin-dot--error' : ''}`} />
            ))}
          </div>
          {pinError && <p className="admin-pin-error">{pinError}</p>}
          <div className="pin-pad-grid">
            {DIGITS.map((d, i) => (
              <button key={i} type="button"
                className={`pin-key ${d === '' ? 'pin-key--empty' : ''}`}
                onClick={() => d !== '' && handleDigit(d)}
                disabled={d === ''}
              >{d}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <h1 className="admin-title">⚙️ Admin</h1>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="admin-player-list">
          {players.map(p => {
            const initials = p.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
            const winRate = p.games_played > 0
              ? Math.round((p.games_won / p.games_played) * 100)
              : 0;

            return (
              <div key={p.id} className="admin-player-row">
                <div className="admin-player-avatar">
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt={p.name} />
                    : <div className="admin-player-initials">{initials}</div>}
                </div>
                <div className="admin-player-info">
                  <span className="admin-player-name">{p.name}</span>
                  <div className="admin-player-stats">
                    <span>🎮 {p.games_played} played</span>
                    <span>🏆 {p.games_won} won</span>
                    {p.games_played > 0 && <span>📊 {winRate}%</span>}
                  </div>
                </div>
                <div className="admin-player-actions">
                  <button
                    className="admin-action-btn admin-action-btn--edit"
                    onClick={() => navigate(`/profile/${p.id}/edit?admin=true`)}
                    title="Edit"
                  >✏️</button>
                  <button
                    className="admin-action-btn admin-action-btn--delete"
                    onClick={() => { setDeleteTarget(p); setDeleteError(''); }}
                    title="Delete"
                  >🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="admin-footer">
        <button className="btn btn-primary btn-full" onClick={() => navigate('/register')}>
          + Add Family Member
        </button>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="admin-delete-overlay">
          <div className="admin-delete-modal">
            <h2>Remove {deleteTarget.name}?</h2>
            <p>This will permanently delete their account and all game history.</p>
            {deleteError && <p className="admin-pin-error">{deleteError}</p>}
            <div className="admin-delete-btns">
              <button className="btn btn-danger btn-full" onClick={() => handleDelete(deleteTarget)} disabled={deleting}>
                {deleting ? 'Removing...' : '🗑️ Yes, Remove'}
              </button>
              <button className="btn btn-outline btn-full" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
