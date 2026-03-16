import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { usePlayer, setPlayer } from '../hooks/usePlayer.js';
import './ProfileEditPage.css';

const ADMIN_PIN = '0790';

const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

function PinPad({ value, onChange, label }) {
  function handleDigit(d) {
    if (d === '⌫') onChange(value.slice(0, -1));
    else if (value.length < 4) onChange(value + d);
  }
  return (
    <div className="pin-field">
      {label && <p className="pin-field-label">{label}</p>}
      <div className="pin-dots">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`pin-dot ${i < value.length ? 'pin-dot--filled' : ''}`} />
        ))}
      </div>
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
  );
}

export default function ProfileEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdminMode = searchParams.get('admin') === 'true';
  const { player: me } = usePlayer();
  const [profilePlayer, setProfilePlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
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
        setProfilePlayer(p);
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

    if (!isAdminMode && (!currentPin || currentPin.length < 4)) {
      return setError('Enter your current PIN to save changes');
    }
    if (changingPin) {
      if (newPin.length !== 4) return setError('New PIN must be 4 digits');
      if (newPin !== confirmPin) return setError('New PINs don\'t match');
    }

    setSaving(true);
    const form = new FormData();
    form.append('name', name);
    form.append('currentPin', isAdminMode ? ADMIN_PIN : currentPin);
    if (changingPin && newPin) form.append('newPin', newPin);
    if (avatarFile) form.append('avatar', avatarFile);

    try {
      const updated = await api.patch(`/api/players/${id}`, form);
      // If editing own profile, update session
      if (me && String(me.id) === String(id)) {
        setPlayer({ ...me, ...updated });
      }
      setSuccess('Profile updated! ✅');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
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

        {/* Current PIN (required to authorize any change, hidden in admin mode) */}
        {!isAdminMode && (
          <PinPad
            value={currentPin}
            onChange={setCurrentPin}
            label="Your current PIN (required to save)"
          />
        )}

        {/* Toggle PIN change */}
        <button
          type="button"
          className={`btn btn-full ${changingPin ? 'btn-outline' : 'btn-primary'}`}
          onClick={() => { setChangingPin(!changingPin); setNewPin(''); setConfirmPin(''); }}
        >
          {changingPin ? 'Cancel PIN Change' : '🔑 Change PIN'}
        </button>

        {changingPin && (
          <>
            <PinPad value={newPin} onChange={setNewPin} label="New PIN" />
            <PinPad value={confirmPin} onChange={setConfirmPin} label="Confirm new PIN" />
          </>
        )}

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        <button type="submit" className="btn btn-success btn-full btn-xl" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes ✅'}
        </button>
      </form>
    </div>
  );
}
