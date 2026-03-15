import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../socket.js';
import { usePlayer } from '../hooks/usePlayer.js';
import './ShareInvitePage.css';

export default function ShareInvitePage() {
  const { token } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { player } = usePlayer();
  const [copied, setCopied] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [declinedBy, setDeclinedBy] = useState('');

  const opponent = state?.opponent;
  const shareUrl = `${window.location.origin}/join/${token}`;
  const shareText = `${player?.name || 'Someone'} wants to play Rock, Paper, Scissors with you! Tap the link to join: ${shareUrl}`;

  // Listen for accept/decline
  useEffect(() => {
    socket.connect();
    socket.emit('join_session', { token, playerId: player?.id });

    socket.on('session_accepted', () => {
      navigate(`/game/${token}`);
    });

    socket.on('invite_declined', ({ byPlayerName }) => {
      setDeclinedBy(byPlayerName);
      setDeclined(true);
    });

    return () => {
      socket.off('session_accepted');
      socket.off('invite_declined');
    };
  }, [token, player?.id]);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText, url: shareUrl });
      } catch {
        // User cancelled share — that's fine
      }
    } else {
      handleCopy();
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (declined) {
    return (
      <div className="page share-page">
        <div className="share-declined">
          <div className="share-declined-moon">🌙</div>
          <div className="share-declined-zzz">
            <span>Z</span><span>Z</span><span>Z</span>
          </div>
          <h2>{declinedBy}</h2>
          <p>is busy right now 😴</p>
          <p>Maybe try again later!</p>
          <button className="btn btn-primary btn-xl" style={{ marginTop: 24 }} onClick={() => navigate('/')}>
            OK 👍
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page share-page">
      <h1 className="page-title">Invite {opponent?.name || 'Someone'}! 📨</h1>

      <div className="share-opponent">
        {opponent?.avatar_url ? (
          <img src={opponent.avatar_url} alt={opponent.name} className="share-opponent-avatar" />
        ) : (
          <div className="share-opponent-initials">
            {opponent?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || '?'}
          </div>
        )}
        <div className="share-opponent-name">{opponent?.name}</div>
      </div>

      <div className="share-game-label">🪨📄✂️ Rock, Paper, Scissors</div>

      <p className="share-instructions">
        Send this link to <strong>{opponent?.name || 'them'}</strong> via iMessage, WhatsApp, or any app:
      </p>

      <div className="share-link-box">
        <span className="share-link-text">{shareUrl}</span>
      </div>

      <div className="share-buttons">
        {navigator.share && (
          <button className="btn btn-primary btn-xl btn-full" onClick={handleShare}>
            📤 Share with {opponent?.name || 'them'}
          </button>
        )}
        <button
          className={`btn btn-full btn-xl ${navigator.share ? 'btn-outline' : 'btn-primary'}`}
          onClick={handleCopy}
        >
          {copied ? '✅ Copied!' : '📋 Copy Link'}
        </button>
      </div>

      <div className="share-waiting">
        <div className="share-waiting-dots">
          <span /><span /><span />
        </div>
        <p>Waiting for {opponent?.name || 'them'} to join...</p>
      </div>

      <button className="btn btn-outline" onClick={() => navigate('/')} style={{ marginTop: 'auto' }}>
        Cancel
      </button>
    </div>
  );
}
