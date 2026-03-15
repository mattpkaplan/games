import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket.js';
import { usePlayer } from '../hooks/usePlayer.js';
import './WaitingPage.css';

export default function WaitingPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { player } = usePlayer();

  useEffect(() => {
    socket.connect();
    socket.emit('join_session', { token, playerId: player?.id });

    socket.on('session_accepted', () => navigate(`/game/${token}`));
    socket.on('opponent_joined', () => navigate(`/game/${token}`));

    return () => {
      socket.off('session_accepted');
      socket.off('opponent_joined');
    };
  }, [token, player?.id]);

  return (
    <div className="page waiting-page">
      <h1 className="page-title">Waiting... 🎮</h1>
      <div className="waiting-dots">
        <span /><span /><span />
      </div>
      <p className="waiting-text">Waiting for the other player to join!</p>
      <button className="btn btn-outline" onClick={() => navigate('/')} style={{ marginTop: 'auto' }}>
        Cancel
      </button>
    </div>
  );
}
