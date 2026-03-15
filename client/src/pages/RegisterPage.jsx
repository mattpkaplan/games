import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { setPlayer } from '../hooks/usePlayer.js';
import './RegisterPage.css';

const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  function handleDigit(d) {
    if (d === '⌫') {
      setPin((p) => p.slice(0, -1));
    } else if (pin.length < 4) {
      setPin((p) => p + d);
    }
  }

  function handleAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Please enter your name');
    if (pin.length !== 4) return setError('Please enter a 4-digit PIN');

    setLoading(true);
    setError('');

    const form = new FormData();
    form.append('name', name.trim());
    form.append('pin', pin);
    if (phone) form.append('phone', phone);
    if (avatarFile) form.append('avatar', avatarFile);

    try {
      const player = await api.post('/api/players', form);
      // Auto-login after register
      const loggedIn = await api.post(`/api/players/${player.id}/login`, { pin });
      setPlayer(loggedIn);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page register-page">
      <h1 className="page-title">Join the Family! 🎮</h1>

      <form onSubmit={handleSubmit} className="register-form">
        {/* Avatar */}
        <div className="register-avatar" onClick={() => fileRef.current?.click()}>
          {preview ? (
            <img src={preview} alt="Your photo" className="register-avatar__img" />
          ) : (
            <div className="register-avatar__placeholder">
              <span>📷</span>
              <span className="register-avatar__hint">Add Photo</span>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleAvatar}
            style={{ display: 'none' }}
          />
        </div>

        {/* Name */}
        <div className="form-field">
          <label htmlFor="name">Your Name</label>
          <input
            id="name"
            type="text"
            placeholder="e.g. Grandpa Joe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="given-name"
          />
        </div>

        {/* Phone (optional) */}
        <div className="form-field">
          <label htmlFor="phone">Phone Number (optional)</label>
          <input
            id="phone"
            type="tel"
            placeholder="e.g. 555-123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </div>

        {/* PIN pad */}
        <div className="form-field">
          <label>Choose a 4-digit PIN</label>
          <div className="pin-display">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={`pin-dot ${i < pin.length ? 'pin-dot--filled' : ''}`} />
            ))}
          </div>
          <div className="pin-pad">
            {DIGITS.map((d, i) => (
              <button
                key={i}
                type="button"
                className={`pin-key ${d === '' ? 'pin-key--empty' : ''}`}
                onClick={() => d !== '' && handleDigit(d)}
                disabled={d === ''}
                aria-label={d === '⌫' ? 'backspace' : d}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button type="submit" className="btn btn-primary btn-full btn-xl" disabled={loading}>
          {loading ? 'Joining...' : "Let's Play! 🚀"}
        </button>
      </form>

      <p className="register-login-hint">
        Already registered? <Link to="/">Go to Lobby</Link>
      </p>
    </div>
  );
}
