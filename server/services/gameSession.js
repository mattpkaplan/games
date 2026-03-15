const { v4: uuidv4 } = require('uuid');
const db = require('../db');

function createSession(playerAId, gameType = 'rps') {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  const stmt = db.prepare(`
    INSERT INTO game_sessions (token, game_type, player_a_id, expires_at)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(token, gameType, playerAId, expiresAt);

  return { id: result.lastInsertRowid, token };
}

function getSessionByToken(token) {
  return db.prepare(`
    SELECT
      s.*,
      pa.name AS player_a_name, pa.avatar_url AS player_a_avatar,
      pb.name AS player_b_name, pb.avatar_url AS player_b_avatar
    FROM game_sessions s
    JOIN players pa ON pa.id = s.player_a_id
    LEFT JOIN players pb ON pb.id = s.player_b_id
    WHERE s.token = ?
  `).get(token);
}

function expireOldSessions() {
  db.prepare(`
    UPDATE game_sessions
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < datetime('now')
  `).run();
}

module.exports = { createSession, getSessionByToken, expireOldSessions };
