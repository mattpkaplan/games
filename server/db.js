const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'games.db');

// Ensure directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    phone      TEXT,
    pin        TEXT    NOT NULL,
    avatar_url TEXT,
    available  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS game_sessions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    token        TEXT    NOT NULL UNIQUE,
    game_type    TEXT    NOT NULL DEFAULT 'rps',
    player_a_id  INTEGER NOT NULL REFERENCES players(id),
    player_b_id  INTEGER REFERENCES players(id),
    status       TEXT    NOT NULL DEFAULT 'pending',
    winner_id    INTEGER REFERENCES players(id),
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    expires_at   TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rps_rounds (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id   INTEGER NOT NULL REFERENCES game_sessions(id),
    round_number INTEGER NOT NULL,
    move_a       TEXT,
    move_b       TEXT,
    result       TEXT
  );
`);

module.exports = db;
