import React from 'react';
import './CountdownReveal.css';

const DISPLAY = {
  rock:     { emoji: '🪨', text: 'ROCK...' },
  paper:    { emoji: '📄', text: 'PAPER...' },
  scissors: { emoji: '✂️', text: 'SCISSORS...' },
  shoot:    { emoji: '🚀', text: 'SHOOT!' },
};

export default function CountdownReveal({ step }) {
  if (!step) return null;
  const { emoji, text } = DISPLAY[step] || {};

  return (
    <div className="countdown-overlay">
      <div className={`countdown-content countdown-content--${step}`} key={step}>
        <span className="countdown-emoji">{emoji}</span>
        <span className="countdown-text">{text}</span>
      </div>
    </div>
  );
}
