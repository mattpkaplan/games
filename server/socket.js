const db = require('./db');
const { evaluateMove, checkGameOver } = require('./services/rpsLogic');

// In-memory game state (session token → state)
const gameSessions = {};

function getOrCreateGameState(token) {
  if (!gameSessions[token]) {
    gameSessions[token] = {
      roleToSocket: {},   // { a: socketId, b: socketId }
      socketToRole: {},   // { socketId: role }
      scores: { a: 0, b: 0 },
      currentRound: 1,
      moves: {},          // { role: move }
      countdownTimer: null,
      playAgainRequester: null,
    };
  }
  return gameSessions[token];
}

function setupSockets(io) {
  io.on('connection', (socket) => {

    // --- LOBBY ---
    socket.on('join_lobby', () => {
      socket.join('lobby');
    });

    socket.on('set_availability', ({ playerId, available }) => {
      db.prepare('UPDATE players SET available = ? WHERE id = ?')
        .run(available ? 1 : 0, playerId);
      io.to('lobby').emit('availability_changed', { playerId, available: !!available });
    });

    // --- GAME SESSION ---
    socket.on('join_session', ({ token, playerId }) => {
      socket.join(`session:${token}`);

      const session = db.prepare(`
        SELECT s.*, pa.name AS player_a_name, pb.name AS player_b_name
        FROM game_sessions s
        JOIN players pa ON pa.id = s.player_a_id
        LEFT JOIN players pb ON pb.id = s.player_b_id
        WHERE s.token = ?
      `).get(token);

      if (!session) return;

      const state = getOrCreateGameState(token);

      // Assign role based on player ID
      let role = null;
      if (String(playerId) === String(session.player_a_id)) {
        role = 'a';
      } else if (session.player_b_id && String(playerId) === String(session.player_b_id)) {
        role = 'b';
      } else if (!state.roleToSocket.b && String(playerId) !== String(session.player_a_id)) {
        // The invite token is the auth — whoever arrives that isn't player A is player B.
        // (Handles the case where player B isn't logged in when they click the link.)
        role = 'b';
      }

      if (role) {
        const prevSocket = state.roleToSocket[role];
        if (prevSocket && prevSocket !== socket.id) {
          delete state.socketToRole[prevSocket];
        }
        state.roleToSocket[role] = socket.id;
        state.socketToRole[socket.id] = role;
      }

      // Re-fetch session in case we just set player_b_id above
      const fresh = db.prepare(`
        SELECT s.*, pa.name AS player_a_name, pb.name AS player_b_name
        FROM game_sessions s
        JOIN players pa ON pa.id = s.player_a_id
        LEFT JOIN players pb ON pb.id = s.player_b_id
        WHERE s.token = ?
      `).get(token);

      // Always broadcast latest names to the whole room so everyone stays in sync
      io.to(`session:${token}`).emit('session_state', {
        status: fresh.status,
        scores: state.scores,
        round: state.currentRound,
        playerAId: fresh.player_a_id,
        playerBId: fresh.player_b_id,
        playerAName: fresh.player_a_name,
        playerBName: fresh.player_b_name,
      });

      // Start the game when both roles are connected
      const bothConnected = state.roleToSocket.a && state.roleToSocket.b;
      if (fresh.status === 'active' && bothConnected) {
        io.to(`session:${token}`).emit('opponent_joined', {});
        io.to(`session:${token}`).emit('choose_now', {});
      }
    });

    // --- RPS MOVE ---
    socket.on('rps_choose', ({ token, playerId, move }) => {
      const validMoves = ['rock', 'paper', 'scissors'];
      if (!validMoves.includes(move)) return;

      const session = db.prepare('SELECT * FROM game_sessions WHERE token = ?').get(token);
      if (!session || session.status !== 'active') return;

      const state = getOrCreateGameState(token);

      // Use the socket's assigned role (handles anonymous player B)
      let role = state.socketToRole[socket.id];
      if (!role) {
        // Fallback: derive from player ID
        if (String(playerId) === String(session.player_a_id)) role = 'a';
        else if (session.player_b_id && String(playerId) === String(session.player_b_id)) role = 'b';
      }
      if (!role) return;

      // Only record once per round
      if (state.moves[role]) return;
      state.moves[role] = move;

      // Acknowledge to the player who just chose
      socket.emit('rps_waiting', {});

      // Tell the OTHER player their opponent has chosen (without revealing the move)
      const otherRole = role === 'a' ? 'b' : 'a';
      const otherSocketId = state.roleToSocket[otherRole];
      if (otherSocketId) {
        io.to(otherSocketId).emit('opponent_chose', {});
      }

      // Both have chosen → play "Rock Paper Scissors Shoot!" then reveal
      if (state.moves.a && state.moves.b) {
        runCountdownThenResolve(io, token, session, state);
      }
    });

    // --- PLAY AGAIN REQUEST (first player asks) ---
    socket.on('play_again_request', ({ token, playerId }) => {
      const session = db.prepare('SELECT * FROM game_sessions WHERE token = ?').get(token);
      if (!session) return;

      const requester = db.prepare('SELECT name FROM players WHERE id = ?').get(playerId);
      const state = getOrCreateGameState(token);
      state.playAgainRequester = String(playerId);

      // Tell the OTHER player about the request
      io.to(`session:${token}`).emit('play_again_requested', {
        byPlayerId: String(playerId),
        byPlayerName: requester ? requester.name : 'Your opponent',
      });
    });

    // --- PLAY AGAIN ACCEPT (second player says yes) ---
    socket.on('play_again_accept', ({ token }) => {
      const state = getOrCreateGameState(token);
      state.scores = { a: 0, b: 0 };
      state.currentRound = 1;
      state.moves = {};
      state.playAgainRequester = null;

      db.prepare("UPDATE game_sessions SET status = 'active', winner_id = NULL WHERE token = ?")
        .run(token);

      io.to(`session:${token}`).emit('new_game', {});
      io.to(`session:${token}`).emit('choose_now', {});
    });

    // --- PLAY AGAIN DECLINE (second player says no) ---
    socket.on('play_again_decline', ({ token, playerId }) => {
      const state = getOrCreateGameState(token);
      state.playAgainRequester = null;

      const decliner = db.prepare('SELECT name FROM players WHERE id = ?').get(playerId);
      io.to(`session:${token}`).emit('play_again_declined', {
        byPlayerName: decliner ? decliner.name : 'Your opponent',
      });
    });

    socket.on('disconnect', () => {
      for (const [token, state] of Object.entries(gameSessions)) {
        const role = state.socketToRole[socket.id];
        if (role) {
          delete state.socketToRole[socket.id];
          if (state.roleToSocket[role] === socket.id) {
            delete state.roleToSocket[role];
          }
        }
      }
    });
  });
}

// After both players pick, show "Rock... Paper... Scissors... SHOOT!" then reveal
function runCountdownThenResolve(io, token, session, state) {
  const steps = ['rock', 'paper', 'scissors', 'shoot'];
  steps.forEach((step, i) => {
    setTimeout(() => {
      io.to(`session:${token}`).emit('countdown_step', { step });
    }, i * 1000);
  });

  // Reveal result 500ms after "SHOOT!" (was 1000ms) so hands snap in on the beat
  setTimeout(() => {
    resolveRound(io, token, session, state);
  }, 3500);
}

function resolveRound(io, token, session, state) {
  const { moves } = state;
  const result = evaluateMove(moves.a, moves.b);

  if (result === 'a_wins') state.scores.a++;
  else if (result === 'b_wins') state.scores.b++;

  db.prepare(`
    INSERT INTO rps_rounds (session_id, round_number, move_a, move_b, result)
    VALUES (?, ?, ?, ?, ?)
  `).run(session.id, state.currentRound, moves.a, moves.b, result);

  io.to(`session:${token}`).emit('rps_reveal', {
    moveA: moves.a,
    moveB: moves.b,
    result,
    scores: { ...state.scores },
    round: state.currentRound,
  });

  const winner = checkGameOver(state.scores);
  if (winner) {
    const winnerId = winner === 'a' ? session.player_a_id : session.player_b_id;
    const winnerRow = db.prepare('SELECT name FROM players WHERE id = ?').get(winnerId);

    db.prepare("UPDATE game_sessions SET status = 'complete', winner_id = ? WHERE token = ?")
      .run(winnerId, token);

    state.playAgainVotes = new Set();

    io.to(`session:${token}`).emit('rps_game_over', {
      winnerId,
      winnerName: winnerRow ? winnerRow.name : 'Someone',
      scores: { ...state.scores },
    });
  } else {
    state.currentRound++;
    state.moves = {};
    // Pause on result, then start next round
    setTimeout(() => {
      io.to(`session:${token}`).emit('choose_now', {});
    }, 3000);
  }
}

module.exports = { setupSockets };
