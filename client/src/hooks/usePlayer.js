import { useState, useEffect } from 'react';
import { api } from '../api.js';

let cachedPlayer = null;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn(cachedPlayer));
}

export function setPlayer(player) {
  cachedPlayer = player;
  if (typeof window !== 'undefined') {
    if (player) {
      localStorage.setItem('playerId', player.id);
    } else {
      localStorage.removeItem('playerId');
    }
  }
  notify();
}

export function usePlayer() {
  const [player, setLocalPlayer] = useState(cachedPlayer);
  const [loading, setLoading] = useState(!cachedPlayer);

  useEffect(() => {
    const update = (p) => setLocalPlayer(p);
    listeners.add(update);

    if (!cachedPlayer) {
      api.get('/api/players/me')
        .then((p) => { cachedPlayer = p; setLocalPlayer(p); })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => listeners.delete(update);
  }, []);

  return { player, loading, setPlayer };
}
