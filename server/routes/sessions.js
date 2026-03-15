const express = require('express');
const db = require('../db');
const { createSession, getSessionByToken } = require('../services/gameSession');

const router = express.Router();

// POST /api/sessions — create a game session
router.post('/', (req, res) => {
  const { playerAId, gameType } = req.body;
  if (!playerAId) return res.status(400).json({ error: 'playerAId required' });

  const { id, token } = createSession(playerAId, gameType || 'rps');
  const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
  const shareUrl = `${baseUrl}/join/${token}`;

  res.status(201).json({ id, token, shareUrl });
});

// GET /api/sessions/:token — get session details
router.get('/:token', (req, res) => {
  const session = getSessionByToken(req.params.token);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  // Check expiry
  if (new Date(session.expires_at) < new Date() && session.status === 'pending') {
    db.prepare("UPDATE game_sessions SET status = 'expired' WHERE token = ?").run(req.params.token);
    return res.status(410).json({ error: 'Invite has expired' });
  }

  res.json(session);
});

// PATCH /api/sessions/:token/accept
router.patch('/:token/accept', (req, res) => {
  const { playerBId } = req.body;
  if (!playerBId) return res.status(400).json({ error: 'playerBId required' });

  const session = getSessionByToken(req.params.token);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.status !== 'pending') return res.status(409).json({ error: `Session is ${session.status}` });

  db.prepare(`
    UPDATE game_sessions SET status = 'active', player_b_id = ? WHERE token = ?
  `).run(playerBId, req.params.token);

  // Notify Player A via socket (emitted from socket.js via global io)
  const io = req.app.get('io');
  io.to(`session:${req.params.token}`).emit('session_accepted', { playerBId });

  res.json({ ok: true, token: req.params.token });
});

// PATCH /api/sessions/:token/decline
router.patch('/:token/decline', (req, res) => {
  const { playerBId } = req.body;
  const session = getSessionByToken(req.params.token);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.status !== 'pending') return res.status(409).json({ error: `Session is ${session.status}` });

  db.prepare("UPDATE game_sessions SET status = 'declined' WHERE token = ?").run(req.params.token);

  const io = req.app.get('io');
  // Get decliner's name for friendly message
  const player = playerBId
    ? db.prepare('SELECT name FROM players WHERE id = ?').get(playerBId)
    : null;
  io.to(`session:${req.params.token}`).emit('invite_declined', {
    byPlayerName: player ? player.name : 'the other player',
  });

  res.json({ ok: true });
});

module.exports = router;
