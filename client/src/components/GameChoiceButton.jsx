import React, { useState } from 'react';
import './GameChoiceButton.css';

const EMOJI = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️',
};

export default function GameChoiceButton({ choice, onSelect, selected, disabled }) {
  const [bouncing, setBouncing] = useState(false);

  function handleClick() {
    if (disabled || selected) return;
    setBouncing(true);
    setTimeout(() => setBouncing(false), 350);
    onSelect(choice);
  }

  return (
    <button
      className={`choice-btn ${selected ? 'choice-btn--selected' : ''} ${bouncing ? 'choice-btn--bounce' : ''} ${disabled ? 'choice-btn--disabled' : ''}`}
      onClick={handleClick}
      disabled={disabled && !selected}
      aria-label={choice}
    >
      <span className="choice-btn__emoji">{EMOJI[choice]}</span>
      <span className="choice-btn__label">{choice.charAt(0).toUpperCase() + choice.slice(1)}</span>
    </button>
  );
}
