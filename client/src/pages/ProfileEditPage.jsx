import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { usePlayer, setPlayer } from '../hooks/usePlayer.js';
import './ProfileEditPage.css';

const ADMIN_PIN = '0790';
const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

// Single PIN pad that collects entry → confirm in sequence
function NewPinFlow({ onComplete, onCancel }) {
  const [stage, setStage] = useState('enter'); // 'enter' | 'confirm'
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [mismatch, setMismatch] = useState(false);

  function handleDigit(d, current, setCurrent) {
    if (d === '⌫') { setCurrent(v => v.slice(0, -1)); setMismatch(false); return; }
    if (current.length >= 4) return;
    const next = current + d;
    setCurrent(next);
    if (next.length === 4) {
      if (stage === 'enter') {
        setStage('confirm');
      } else {
        if (next === first) {
          onComplete(first);
        } else {
          setMismatch(true);
          setTimeout(() => {
            setStage('enter');
            setFirst('');
            setSecond('');
            setMismatch(false);
          }, 700);
        }
      }
    }
  }

  const value = stage === 'enter' ? first : second;
  const setter = stage === 'enter' ? setFirst : setSecond;

  return (
    <div className="pin-field">
      <p className="pin-field-label" style={{ color: mismatch ? 'var(--color-danger)' : undefined }}>
        {mismatch ? "PINs didn't match — try again" : stage === 'enter' ? 'Enter new PIN' : 'Confirm new PIN'}
      </p>
      <div className="pin-dots">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`pin-dot ${i < value.length ? 'pin-dot--filled' : ''} ${mismatch ? 'pin-dot--error' : ''}`} />
        ))}
      </div>
      <div className="pin-pad-grid">
        {DIGITS.map((d, i) => (
          <button key={i} type="button"
            className={`pin-key ${d === '' ? 'pin-key--empty' : ''}`}
            onClick={() => d !== '' && handleDigit(d, value, setter)}
            disabled={d === ''}
          >{d}</button>
        ))}
      </div>
      <button type="button" className="btn btn-outline btn-full" style={{ marginTop: 8 }}
        onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

export default function ProfileEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdminMode = searchParams.get('admin') === 'true';
  const { player: me } = usePlayer();
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [newPin, setNewPin] = useState('');
  const [changingPin, setChangingPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    api.get('/api/players')
      .then((players) => {
        const p = players.find((p) => String(p.id) === String(id));
        if (!p) { navigate('/'); return; }
        setName(p.name);
        setPreview(p.avatar_url || null);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const form = new FormData();
    form.append('name', name);
    if (isAdminMode) form.append('currentPin', ADMIN_PIN);
    if (newPin) form.append('newPin', newPin);
    if (avatarFile) form.append('avatar', avatarFile);

    try {
      const updated = await api.patch(`/api/players/${id}`, form);
      if (me && String(me.id) === String(id)) {
        setPlayer({ ...me, ...updated });
      }
      setSuccess('Profile updated! ✅');
      setNewPin('');
      setChangingPin(false);
      setAvatarFile(null);
      setTimeout(() => navigate(isAdminMode ? '/admin' : '/'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page profile-edit-page">
      <button className="back-btn" onClick={() => navigate(isAdminMode ? '/admin' : '/')}>← Back</button>
      <h1 className="page-title">{isAdminMode ? '⚙️ Admin Edit' : 'Edit Profile ✏️'}</h1>

      <form onSubmit={handleSave} className="profile-edit-form">
        {/* Avatar */}
        <div className="profile-avatar-wrap" onClick={() => fileRef.current?.click()}>
          {preview ? (
            <img src={preview} alt="Photo" className="profile-avatar-img" />
          ) : (
            <div className="profile-avatar-placeholder">
              <span style={{ fontSize: '2.5rem' }}>📷</span>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>Change Photo</span>
            </div>
          )}
          <div className="profile-avatar-edit-badge">✏️</div>
          <input ref={fileRef} type="file" accept="image/*" capture="user"
            onChange={handleAvatar} style={{ display: 'none' }} />
        </div>

        {/* Name */}
        <div className="form-field">
          <label htmlFor="edit-name">Name</label>
          <input id="edit-name" type="text" value={name}
            onChange={(e) => setName(e.target.value)} />
        </div>

        {/* PIN change — single sequential pad */}
        {!changingPin ? (
          <button type="button" className="btn btn-primary btn-full"
            onClick={() => setChangingPin(true)}>
            🔑 Change PIN
          </button>
        ) : (
          <NewPinFlow
            onComplete={(pin) => { setNewPin(pin); setChangingPin(false); }}
            onCancel={() => { setChangingPin(false); setNewPin(''); }}
          />
        )}

        {newPin && !changingPin && (
          <p style={{ textAlign: 'center', color: '#22c55e', fontWeight: 700, fontSize: '0.9rem' }}>
            ✅ New PIN set — save to apply
          </p>
        )}

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        {!changingPin && (
          <button type="submit" className="btn btn-success btn-full btn-xl" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes ✅'}
          </button>
        )}
      </form>
    </div>
  );
}
