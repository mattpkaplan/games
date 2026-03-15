import React, { useEffect, useState } from 'react';
import './ResultBanner.css';

const MOVE_EMOJI = { rock: '🪨', paper: '📄', scissors: '✂️' };

export default function ResultBanner({ result, myRole, moveA, moveB, myName, opponentName }) {
  const [confetti, setConfetti] = useState([]);

  const iWon = (result === 'a_wins' && myRole === 'a') || (result === 'b_wins' && myRole === 'b');
  const tied = result === 'tie';
  const iLost = !iWon && !tied;

  useEffect(() => {
    if (iWon) {
      setConfetti(Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        color: ['#f59e0b', '#6c63ff', '#22c55e', '#ef4444', '#3b82f6'][i % 5],
        delay: `${Math.random() * 0.5}s`,
        duration: `${1.5 + Math.random()}s`,
      })));
    }
  }, [iWon]);

  const myMove = myRole === 'a' ? moveA : moveB;
  const oppMove = myRole === 'a' ? moveB : moveA;

  return (
    <div className={`result-banner result-banner--${iWon ? 'win' : tied ? 'tie' : 'lose'}`}>
      {confetti.map((c) => (
        <div
          key={c.id}
          className="confetti-piece"
          style={{
            left: c.left,
            background: c.color,
            animationDelay: c.delay,
            animationDuration: c.duration,
          }}
        />
      ))}

      <div className="result-banner__moves">
        <div className="result-banner__move">
          <span className="result-banner__move-emoji">{MOVE_EMOJI[myMove]}</span>
          <span className="result-banner__move-name">{myName || 'You'}</span>
        </div>
        <span className="result-banner__vs">VS</span>
        <div className="result-banner__move">
          <span className="result-banner__move-emoji">{MOVE_EMOJI[oppMove]}</span>
          <span className="result-banner__move-name">{opponentName || 'Them'}</span>
        </div>
      </div>

      <div className="result-banner__outcome">
        {iWon && <><span className="result-banner__icon">🏆</span><span>You Win! ★</span></>}
        {tied && <><span className="result-banner__icon">🤝</span><span>Tie!</span></>}
        {iLost && <><span className="result-banner__icon">😅</span><span>They Win!</span></>}
      </div>
    </div>
  );
}
