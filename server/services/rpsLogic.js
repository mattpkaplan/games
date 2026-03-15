const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

function evaluateMove(moveA, moveB) {
  if (moveA === moveB) return 'tie';
  if (BEATS[moveA] === moveB) return 'a_wins';
  return 'b_wins';
}

function checkGameOver(scores) {
  if (scores.a >= 3) return 'a';
  if (scores.b >= 3) return 'b';
  return null;
}

module.exports = { evaluateMove, checkGameOver };
