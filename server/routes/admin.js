const express = require('express');
const db = require('../db');

const router = express.Router();
const ADMIN_PIN = '0790';

function requireAdmin(req, res, next) {
  const pin = req.body.adminPin || req.query.adminPin;
  if (pin !== ADMIN_PIN) return res.status(401).json({ error: 'Invalid admin PIN' });
  next();
}

// POST /api/admin/verify — check admin PIN
router.post('/verify', (req, res) => {
  if (req.body.pin !== ADMIN_PIN) return res.status(401).json({ error: 'Wrong PIN' });
  res.json({ ok: true });
});

// GET /api/admin/players?adminPin=xxxx — players with stats
router.get('/players', requireAdmin, (req, res) => {
  const players = db.prepare(`
    SELECT
      p.id, p.name, p.avatar_url, p.available,
      COUNT(DISTINCT gs.id) AS games_played,
      COUNT(DISTINCT CASE WHEN gs.winner_id = p.id THEN gs.id END) AS games_won
    FROM players p
    LEFT JOIN game_sessions gs
      ON (gs.player_a_id = p.id OR gs.player_b_id = p.id)
      AND gs.status = 'complete'
    GROUP BY p.id
    ORDER BY p.name
  `).all();
  res.json(players);
});

module.exports = router;
module.exports.ADMIN_PIN = ADMIN_PIN;
