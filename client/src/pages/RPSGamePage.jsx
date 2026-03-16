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

const MOVE_EMOJI = { rock: '✊', paper: '🖐️', scissors: '✌️' };

function getFistState(phase, move, isMe, iWon, countdownStep) {
  if (countdownStep)              return { emoji: '✊', mod: 'shaking' };
  if (phase === PHASE.REVEAL)     return { emoji: MOVE_EMOJI[move] || '✊', mod: isMe ? 'reveal-me' : 'reveal-opp' };
  if (phase === PHASE.GAME_OVER)  return { emoji: iWon ? '👍' : '😢', mod: iWon ? 'winner' : 'loser' };
  if (phase === PHASE.WAITING && isMe) return { emoji: '✊', mod: 'ready' };
  return { emoji: '✊', mod: 'idle' };
}

export default function RPSGamePage() {
  const { token }  = useParams();
  const navigate   = useNavigate();
  const { player } = usePlayer();

  const [phase,          setPhase]          = useState(PHASE.CONNECTING);
  const [countdownStep,  setCountdownStep]  = useState(null);
  const [myRole,         setMyRole]         = useState(null);
  const [myMove,         setMyMove]         = useState(null);
  const [reveal,         setReveal]         = useState(null);
  const [scores,         setScores]         = useState({ a: 0, b: 0 });
  const [gameOver,       setGameOver]       = useState(null);
  const [playAgainState, setPlayAgainState] = useState('idle');
  const [playAgainAsker, setPlayAgainAsker] = useState(null);
  const [sessionInfo,    setSessionInfo]    = useState(null);
  const [currentRound,   setCurrentRound]   = useState(1);

  const socketRef = useRef(socket);

  useEffect(() => {
    const s = socketRef.current;
    s.connect();
    s.emit('join_session', { token, playerId: player?.id });

    s.on('session_state', (data) => {
      setSessionInfo(data);
      setScores(data.scores || { a: 0, b: 0 });
      setCurrentRound(data.round || 1);
      if (player) {
        if      (String(data.playerAId) === String(player.id)) setMyRole('a');
        else if (String(data.playerBId) === String(player.id)) setMyRole('b');
      }
    });

    s.on('opponent_joined', () => {});
    s.on('countdown_step', ({ step }) => setCountdownStep(step));

    s.on('choose_now', () => {
      setCountdownStep(null); setMyMove(null); setReveal(null);
      setPhase(PHASE.CHOOSING);
    });

    s.on('rps_waiting', () => setPhase(PHASE.WAITING));

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
      setPlayAgainState('idle'); setPlayAgainAsker(null);
      setScores({ a: 0, b: 0 }); setCurrentRound(1);
    });

    return () => {
      ['session_state','opponent_joined','countdown_step','choose_now','rps_waiting',
       'rps_reveal','rps_game_over','play_again_requested','play_again_declined','new_game']
        .forEach(e => s.off(e));
      s.disconnect();
    };
  }, [token, player?.id]);

  function handleChoose(move) {
    if (phase !== PHASE.CHOOSING || myMove) return;
    setMyMove(move);
    socket.emit('rps_choose', { token, playerId: player?.id, move });
  }

  // ── Derived values ──────────────────────────────────────────────────
  const myScore  = myRole === 'a' ? scores.a : scores.b;
  const oppScore = myRole === 'a' ? scores.b : scores.a;
  const myName   = player?.name || 'You';
  const oppName  = myRole === 'a' ? sessionInfo?.playerBName : sessionInfo?.playerAName;

  const iWon = gameOver ? String(gameOver.winnerId) === String(player?.id) : false;

  const myRevealMove  = reveal ? (myRole === 'a' ? reveal.moveA : reveal.moveB) : myMove;
  const oppRevealMove = reveal ? (myRole === 'a' ? reveal.moveB : reveal.moveA) : null;

  const myFist  = getFistState(phase, myRevealMove,  true,  iWon,  countdownStep);
  const oppFist = getFistState(phase, oppRevealMove, false, !iWon, countdownStep);

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

      {/* ── HEADER ── */}
      <div className="rps-header">
        <div className="rps-player-col">
          <span className="rps-player-name">{myName}</span>
          <StarScore score={myScore} total={3} />
        </div>
        <div className="rps-round-info">
          <span className={`rps-round-badge ${phase === PHASE.GAME_OVER ? 'rps-round-badge--over' : ''}`}>
            {phase === PHASE.GAME_OVER ? 'Game Over!' : `Round ${currentRound}`}
          </span>
        </div>
        <div className="rps-player-col">
          <span className="rps-player-name">{oppName || 'Opponent'}</span>
          <StarScore score={oppScore} total={3} />
        </div>
      </div>

      {/* ── ARENA ── */}
      <div className="rps-arena">

        {/* My fist (left, faces right) */}
        <div className={`rps-fist rps-fist--me rps-fist--${myFist.mod}`}>
          <span className="rps-fist__emoji" key={`me-${phase}-${countdownStep}`}>
            {myFist.emoji}
          </span>
          {phase === PHASE.WAITING && (
            <span className="rps-fist__badge rps-fist__badge--ready">Ready!</span>
          )}
          {phase === PHASE.REVEAL && myRevealMove && (
            <span className="rps-fist__label">{myRevealMove.toUpperCase()}</span>
          )}
        </div>

        {/* Center: countdown word or round result */}
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

        {/* Opponent fist (right, mirrored to face left) */}
        <div className={`rps-fist rps-fist--opp rps-fist--${oppFist.mod}`}>
          <span className="rps-fist__emoji" key={`opp-${phase}-${countdownStep}`}>
            {oppFist.emoji}
          </span>
          {phase === PHASE.REVEAL && oppRevealMove && (
            <span className="rps-fist__label">{oppRevealMove.toUpperCase()}</span>
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
          <p className="rps-choose-hint">Waiting for {oppName || 'opponent'}... 🤔</p>
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
                  <p>Waiting for {oppName || 'opponent'}...</p>
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
