const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

const { ADMIN_PIN } = require('./admin');
const router = express.Router();

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../data/uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

// GET /api/players — list all players for lobby
router.get('/', (req, res) => {
  const players = db.prepare(`
    SELECT id, name, avatar_url, available, created_at FROM players ORDER BY name
  `).all();
  res.json(players);
});

// POST /api/players — register new player
router.post('/', upload.single('avatar'), async (req, res) => {
  const { name, pin, phone } = req.body;
  if (!name || !pin) return res.status(400).json({ error: 'Name and PIN required' });
  if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'PIN must be 4 digits' });

  const hashed = await bcrypt.hash(pin, 10);
  const avatarUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = db.prepare(`
      INSERT INTO players (name, phone, pin, avatar_url) VALUES (?, ?, ?, ?)
    `).run(name.trim(), phone || null, hashed, avatarUrl);

    const player = db.prepare(
      'SELECT id, name, avatar_url, available FROM players WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json(player);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }
    throw err;
  }
});

// POST /api/players/:id/login — verify PIN, set session cookie
router.post('/:id/login', async (req, res) => {
  const { pin } = req.body;
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const ok = await bcrypt.compare(String(pin), player.pin);
  if (!ok) return res.status(401).json({ error: 'Wrong PIN' });

  req.session.playerId = player.id;
  res.json({ id: player.id, name: player.name, avatar_url: player.avatar_url, available: player.available });
});

// POST /api/players/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// GET /api/players/me — current session player
router.get('/me', (req, res) => {
  if (!req.session.playerId) return res.status(401).json({ error: 'Not logged in' });
  const player = db.prepare(
    'SELECT id, name, avatar_url, available FROM players WHERE id = ?'
  ).get(req.session.playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  res.json(player);
});

// PATCH /api/players/:id — update profile (name, phone, avatar, optionally new PIN)
// Requires current PIN to authorize
router.patch('/:id', upload.single('avatar'), async (req, res) => {
  const { name, phone, currentPin, newPin } = req.body;
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  // Verify current PIN (or allow admin PIN as override)
  const isAdmin = String(currentPin || '') === ADMIN_PIN;
  const ok = isAdmin || await bcrypt.compare(String(currentPin || ''), player.pin);
  if (!ok) return res.status(401).json({ error: 'Wrong PIN' });

  // Validate new PIN if provided
  if (newPin && !/^\d{4}$/.test(newPin)) {
    return res.status(400).json({ error: 'New PIN must be 4 digits' });
  }

  const updates = {};
  if (name && name.trim()) updates.name = name.trim();
  if (phone !== undefined) updates.phone = phone || null;
  if (newPin) updates.pin = await bcrypt.hash(newPin, 10);
  if (req.file) {
    // Delete old avatar file if it exists
    if (player.avatar_url) {
      const oldPath = path.join(uploadDir, path.basename(player.avatar_url));
      fs.unlink(oldPath, () => {}); // ignore errors
    }
    updates.avatar_url = `/uploads/${req.file.filename}`;
  }

  if (Object.keys(updates).length === 0) {
    return res.json({ id: player.id, name: player.name, avatar_url: player.avatar_url, available: player.available });
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), req.params.id];
  db.prepare(`UPDATE players SET ${setClauses} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT id, name, avatar_url, available FROM players WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/players/:id — remove a player (requires PIN of the player being deleted, or any admin PIN)
router.delete('/:id', async (req, res) => {
  const { pin } = req.body;
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  // Verify player PIN or admin PIN
  const isAdmin = String(pin || '') === ADMIN_PIN;
  const ok = isAdmin || await bcrypt.compare(String(pin || ''), player.pin);
  if (!ok) return res.status(401).json({ error: 'Wrong PIN' });

  // Delete avatar file if it exists
  if (player.avatar_url) {
    const filePath = path.join(uploadDir, path.basename(player.avatar_url));
    fs.unlink(filePath, () => {});
  }

  // Remove from game sessions and player record
  db.prepare('DELETE FROM rps_rounds WHERE session_id IN (SELECT id FROM game_sessions WHERE player_a_id = ? OR player_b_id = ?)').run(player.id, player.id);
  db.prepare('DELETE FROM game_sessions WHERE player_a_id = ? OR player_b_id = ?').run(player.id, player.id);
  db.prepare('DELETE FROM players WHERE id = ?').run(player.id);

  res.json({ ok: true });
});

// PATCH /api/players/:id/availability — toggle available
router.patch('/:id/availability', (req, res) => {
  const { available } = req.body;
  if (typeof available !== 'boolean' && available !== 0 && available !== 1) {
    return res.status(400).json({ error: 'available must be boolean' });
  }
  const val = available ? 1 : 0;
  db.prepare('UPDATE players SET available = ? WHERE id = ?').run(val, req.params.id);
  const player = db.prepare(
    'SELECT id, name, avatar_url, available FROM players WHERE id = ?'
  ).get(req.params.id);
  res.json(player);
});

module.exports = router;
