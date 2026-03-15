import React from 'react';
import './StarScore.css';

export default function StarScore({ score, total = 3, label }) {
  return (
    <div className="star-score">
      {label && <span className="star-score__label">{label}</span>}
      <div className="star-score__stars">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`star-score__star ${i < score ? 'star-score__star--filled' : ''}`}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
}
