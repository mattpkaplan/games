import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket.js';
import { usePlayer } from '../hooks/usePlayer.js';
import GameChoiceButton from '../components/GameChoiceButton.jsx';
import StarScore from '../components/StarScore.jsx';
import './RPSGamePage.css';

const PHASE = {
  CONNECTING: 'connecting',
  CHOOSING:   'choosing',
  WAITING:    'waiting',
  REVEAL:     'reveal',
  GAME_OVER:  'game_over',
};

const MOVE_EMOJI = { rock: '🤜', paper: '🖐️', scissors: '✌️' };
const IDLE_FIST  = '✊';

// side = 'a' (left) or 'b' (right)
function getFistState(phase, move, side, isWinner, countdownStep, isReady) {
  if (countdownStep === 'shoot') return { emoji: MOVE_EMOJI[move] || IDLE_FIST, mod: `reveal-${side}` };
  if (countdownStep)             return { emoji: IDLE_FIST, mod: 'shaking' };
  if (phase === PHASE.REVEAL)    return { emoji: MOVE_EMOJI[move] || IDLE_FIST, mod: `reveal-${side}` };
  if (phase === PHASE.GAME_OVER) return { emoji: isWinner ? '👍' : '👎', mod: isWinner ? 'winner' : 'loser' };
  if (isReady)                   return { emoji: IDLE_FIST, mod: 'ready' };
  return { emoji: IDLE_FIST, mod: 'idle' };
}

export default function RPSGamePage() {
  const { token }  = useParams();
  const navigate   = useNavigate();
  const { player } = usePlayer();

  const [phase,          setPhase]          = useState(PHASE.CONNECTING);
  const [countdownStep,  setCountdownStep]  = useState(null);
  const [myRole,         setMyRole]         = useState(null);
  const [myMove,         setMyMove]         = useState(null);
  const [opponentChose,  setOpponentChose]  = useState(false);
  const [reveal,         setReveal]         = useState(null);
  const [scores,         setScores]         = useState({ a: 0, b: 0 });
  const [gameOver,       setGameOver]       = useState(null);
  const [playAgainState, setPlayAgainState] = useState('idle');
  const [playAgainAsker, setPlayAgainAsker] = useState(null);
  const [sessionInfo,    setSessionInfo]    = useState(null);
  const [currentRound,   setCurrentRound]   = useState(1);

  const socketRef = useRef(socket);

  // Assign role whenever player or sessionInfo loads (fixes race condition)
  useEffect(() => {
    if (!sessionInfo) return;
    if (player && String(sessionInfo.playerAId) === String(player.id)) {
      setMyRole('a');
    } else if (player && sessionInfo.playerBId && String(sessionInfo.playerBId) === String(player.id)) {
      setMyRole('b');
    } else if (!sessionInfo.playerBId) {
      setMyRole('b'); // anonymous accept
    }
  }, [player?.id, sessionInfo?.playerAId, sessionInfo?.playerBId]);

  useEffect(() => {
    const s = socketRef.current;
    s.connect();
    s.emit('join_session', { token, playerId: player?.id });

    s.on('session_state', (data) => {
      setSessionInfo(data);
      setScores(data.scores || { a: 0, b: 0 });
      setCurrentRound(data.round || 1);
    });

    s.on('opponent_joined', () => {});
    s.on('countdown_step', ({ step }) => setCountdownStep(step));

    s.on('choose_now', () => {
      setCountdownStep(null); setMyMove(null); setReveal(null);
      setOpponentChose(false);
      setPhase(PHASE.CHOOSING);
    });

    s.on('rps_waiting',    () => setPhase(PHASE.WAITING));
    s.on('opponent_chose', () => setOpponentChose(true));

    s.on('rps_reveal', (data) => {
      setCountdownStep(null); setReveal(data);
      setScores(data.scores); setCurrentRound(data.round);
      setPhase(PHASE.REVEAL);
    });

    s.on('rps_game_over', (data) => {
      setCountdownStep(null); setGameOver(data);
      setScores(data.scores); setPhase(PHASE.GAME_OVER);
    });

    s.on('play_again_requested', ({ byPlayerId, byPlayerName }) => {
      if (String(byPlayerId) === String(player?.id)) setPlayAgainState('waiting');
      else { setPlayAgainAsker(byPlayerName); setPlayAgainState('asked'); }
    });

    s.on('play_again_declined', ({ byPlayerName }) => {
      setPlayAgainAsker(byPlayerName); setPlayAgainState('declined');
    });

    s.on('new_game', () => {
      setGameOver(null); setReveal(null); setMyMove(null); setCountdownStep(null);
      setOpponentChose(false);
      setPlayAgainState('idle'); setPlayAgainAsker(null);
      setScores({ a: 0, b: 0 }); setCurrentRound(1);
    });

    return () => {
      ['session_state','opponent_joined','countdown_step','choose_now','rps_waiting',
       'opponent_chose','rps_reveal','rps_game_over','play_again_requested','play_again_declined','new_game']
        .forEach(e => s.off(e));
      s.disconnect();
    };
  }, [token, player?.id]);

  function handleChoose(move) {
    if (phase !== PHASE.CHOOSING || myMove) return;
    setMyMove(move);
    socket.emit('rps_choose', { token, playerId: player?.id, move });
  }

  // ── Layout: Player A always left, Player B always right ─────────────
  const aName = sessionInfo?.playerAName || '...';
  const bName = sessionInfo?.playerBName || '...';
  const oppName = myRole === 'a' ? bName : aName;

  const iWon     = gameOver ? String(gameOver.winnerId) === String(player?.id) : false;
  const aIsWinner = gameOver ? String(gameOver.winnerId) === String(sessionInfo?.playerAId) : false;
  const bIsWinner = gameOver ? !aIsWinner : false;

  // Who has chosen (shows "Ready!" badge)
  const aIsReady = (myRole === 'a' && !!myMove) || (myRole === 'b' && opponentChose);
  const bIsReady = (myRole === 'b' && !!myMove) || (myRole === 'a' && opponentChose);
  const showReadyBadge = phase === PHASE.CHOOSING || phase === PHASE.WAITING;

  const aFist = getFistState(phase, reveal?.moveA, 'a', aIsWinner, countdownStep, aIsReady);
  const bFist = getFistState(phase, reveal?.moveB, 'b', bIsWinner, countdownStep, bIsReady);

  let resultLabel = '', resultClass = '';
  if (phase === PHASE.REVEAL && reveal) {
    if (reveal.result === 'tie') {
      resultLabel = 'Tie! 🤝'; resultClass = 'tie';
    } else {
      const iWonRound = (reveal.result === 'a_wins' && myRole === 'a') ||
                        (reveal.result === 'b_wins' && myRole === 'b');
      resultLabel = iWonRound ? 'You win! ⭐' : 'They win!';
      resultClass = iWonRound ? 'win' : 'lose';
    }
  }

  const countdownWord = countdownStep === 'shoot' ? 'SHOOT!'
                      : countdownStep ? countdownStep.toUpperCase() + '...' : '';

  return (
    <div className="rps-page">

      {/* ── HEADER ── A left, B right ── */}
      <div className="rps-header">
        <div className="rps-player-col">
          <span className="rps-player-name">{aName}</span>
          <StarScore score={scores.a} total={3} />
        </div>
        <div className="rps-round-info">
          <span className={`rps-round-badge ${phase === PHASE.GAME_OVER ? 'rps-round-badge--over' : ''}`}>
            {phase === PHASE.GAME_OVER ? 'Game Over!' : `Round ${currentRound}`}
          </span>
        </div>
        <div className="rps-player-col">
          <span className="rps-player-name">{bName}</span>
          <StarScore score={scores.b} total={3} />
        </div>
      </div>

      {/* ── ARENA ── A left, B right ── */}
      <div className="rps-arena">

        {/* Player A fist — left side, faces right (no mirror) */}
        <div className={`rps-fist rps-fist--a rps-fist--${aFist.mod}`}>
          <span className="rps-fist__emoji" key={`a-${phase}-${countdownStep}`}>
            {aFist.emoji}
          </span>
          {showReadyBadge && aIsReady && (
            <span className="rps-fist__badge rps-fist__badge--ready">Ready!</span>
          )}
          {phase === PHASE.REVEAL && reveal?.moveA && (
            <span className="rps-fist__label">{reveal.moveA.toUpperCase()}</span>
          )}
        </div>

        {/* Center */}
        <div className="rps-arena-center">
          {countdownStep && (
            <span className="rps-countdown-word" key={countdownStep}>{countdownWord}</span>
          )}
          {phase === PHASE.REVEAL && !countdownStep && (
            <span className={`rps-result-word rps-result-word--${resultClass}`} key="result">
              {resultLabel}
            </span>
          )}
          {phase === PHASE.CONNECTING && (
            <div className="waiting-dots"><span /><span /><span /></div>
          )}
        </div>

        {/* Player B fist — right side, faces left (scaleX(-1) in CSS) */}
        <div className={`rps-fist rps-fist--b rps-fist--${bFist.mod}`}>
          <span className="rps-fist__emoji" key={`b-${phase}-${countdownStep}`}>
            {bFist.emoji}
          </span>
          {showReadyBadge && bIsReady && (
            <span className="rps-fist__badge rps-fist__badge--ready">Ready!</span>
          )}
          {phase === PHASE.REVEAL && reveal?.moveB && (
            <span className="rps-fist__label">{reveal.moveB.toUpperCase()}</span>
          )}
        </div>

      </div>

      {/* ── BOTTOM ── */}
      <div className="rps-bottom">

        {phase === PHASE.CONNECTING && (
          <p className="rps-status-text">Waiting for opponent...</p>
        )}

        {phase === PHASE.CHOOSING && (
          <>
            <p className="rps-choose-hint">Choose your move! 👇</p>
            <div className="rps-choices">
              {['rock', 'paper', 'scissors'].map((c) => (
                <GameChoiceButton key={c} choice={c} onSelect={handleChoose}
                  selected={myMove === c} disabled={false} />
              ))}
            </div>
          </>
        )}

        {phase === PHASE.WAITING && (
          <p className="rps-choose-hint">Waiting for {oppName}... 🤔</p>
        )}

        {phase === PHASE.GAME_OVER && gameOver && (
          <div className="rps-game-over">
            <h2 className="rps-game-over-title">
              {iWon ? 'You Win! 🎉' : `${gameOver.winnerName} Wins!`}
            </h2>
            <div className="rps-play-again-area">
              {playAgainState === 'idle' && (
                <button className="btn btn-primary btn-xl btn-full" onClick={() => {
                  setPlayAgainState('waiting');
                  socket.emit('play_again_request', { token, playerId: player?.id });
                }}>Play Again! 🔁</button>
              )}
              {playAgainState === 'waiting' && (
                <div className="rps-waiting-vote">
                  <div className="waiting-dots"><span /><span /><span /></div>
                  <p>Waiting for {oppName}...</p>
                </div>
              )}
              {playAgainState === 'asked' && (
                <div className="rps-rematch-request">
                  <p className="rps-rematch-msg"><strong>{playAgainAsker}</strong> wants a rematch!</p>
                  <button className="btn btn-success btn-xl btn-full"
                    onClick={() => socket.emit('play_again_accept', { token })}>
                    ✅ Yes, let's go!
                  </button>
                  <button className="btn btn-outline btn-full" onClick={() => {
                    socket.emit('play_again_decline', { token, playerId: player?.id });
                    navigate('/');
                  }}>😴 Sorry, not now</button>
                </div>
              )}
              {playAgainState === 'declined' && (
                <div className="rps-declined-msg">
                  <span className="rps-declined-icon">😴</span>
                  <p><strong>{playAgainAsker}</strong> is done for now!</p>
                </div>
              )}
              {playAgainState !== 'asked' && (
                <button className="btn btn-outline btn-full" onClick={() => navigate('/')}>
                  Back to Lobby
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
