import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket.js';
import { usePlayer } from '../hooks/usePlayer.js';
import GameChoiceButton from '../components/GameChoiceButton.jsx';
import StarScore from '../components/StarScore.jsx';
import CountdownReveal from '../components/CountdownReveal.jsx';
import ResultBanner from '../components/ResultBanner.jsx';
import './RPSGamePage.css';

const PHASE = {
  CONNECTING: 'connecting',
  CHOOSING: 'choosing',
  WAITING: 'waiting',   // my pick is in, waiting for opponent
  REVEAL: 'reveal',
  GAME_OVER: 'game_over',
};

export default function RPSGamePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { player } = usePlayer();

  const [phase, setPhase] = useState(PHASE.CONNECTING);
  const [countdownStep, setCountdownStep] = useState(null); // overlay only, doesn't replace phase
  const [myRole, setMyRole] = useState(null);
  const [myMove, setMyMove] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [scores, setScores] = useState({ a: 0, b: 0 });
  const [gameOver, setGameOver] = useState(null);
  const [playAgainState, setPlayAgainState] = useState('idle'); // idle | asked | waiting | declined
  const [playAgainAsker, setPlayAgainAsker] = useState(null);   // name of who asked
  const [sessionInfo, setSessionInfo] = useState(null);
  const [currentRound, setCurrentRound] = useState(1);

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
        if (String(data.playerAId) === String(player.id)) setMyRole('a');
        else if (String(data.playerBId) === String(player.id)) setMyRole('b');
      }
      // Stay in CONNECTING until choose_now arrives
    });

    s.on('opponent_joined', () => {
      // Server will follow up with choose_now
    });

    // Countdown is an overlay — don't change the underlying phase
    s.on('countdown_step', ({ step }) => {
      setCountdownStep(step);
    });

    // Tell players to pick (start of each round)
    s.on('choose_now', () => {
      setCountdownStep(null);
      setMyMove(null);
      setReveal(null);
      setPhase(PHASE.CHOOSING);
    });

    // My pick was recorded; waiting for opponent
    s.on('rps_waiting', () => {
      setPhase(PHASE.WAITING);
    });

    s.on('rps_reveal', (data) => {
      setCountdownStep(null);
      setReveal(data);
      setScores(data.scores);
      setCurrentRound(data.round);
      setPhase(PHASE.REVEAL);
    });

    s.on('rps_game_over', (data) => {
      setCountdownStep(null);
      setGameOver(data);
      setScores(data.scores);
      setPhase(PHASE.GAME_OVER);
    });

    // Sent to BOTH players when someone requests a rematch
    s.on('play_again_requested', ({ byPlayerId, byPlayerName }) => {
      if (String(byPlayerId) === String(player?.id)) {
        // I'm the one who asked — show waiting state
        setPlayAgainState('waiting');
      } else {
        // Opponent asked me — show accept/decline
        setPlayAgainAsker(byPlayerName);
        setPlayAgainState('asked');
      }
    });

    s.on('play_again_declined', ({ byPlayerName }) => {
      setPlayAgainAsker(byPlayerName);
      setPlayAgainState('declined');
    });

    s.on('new_game', () => {
      setGameOver(null);
      setReveal(null);
      setMyMove(null);
      setCountdownStep(null);
      setPlayAgainState('idle');
      setPlayAgainAsker(null);
      setScores({ a: 0, b: 0 });
      setCurrentRound(1);
      // choose_now follows immediately from server
    });

    return () => {
      s.off('session_state');
      s.off('opponent_joined');
      s.off('countdown_step');
      s.off('choose_now');
      s.off('rps_waiting');
      s.off('rps_reveal');
      s.off('rps_game_over');
      s.off('play_again_requested');
      s.off('play_again_declined');
      s.off('new_game');
      s.disconnect();
    };
  }, [token, player?.id]);

  function handleChoose(move) {
    if (phase !== PHASE.CHOOSING || myMove) return;
    setMyMove(move);
    socket.emit('rps_choose', { token, playerId: player?.id, move });
  }

  function handlePlayAgainRequest() {
    setPlayAgainState('waiting');
    socket.emit('play_again_request', { token, playerId: player?.id });
  }

  function handlePlayAgainAccept() {
    socket.emit('play_again_accept', { token });
  }

  function handlePlayAgainDecline() {
    socket.emit('play_again_decline', { token, playerId: player?.id });
    navigate('/');
  }

  const myScore = myRole === 'a' ? scores.a : scores.b;
  const oppScore = myRole === 'a' ? scores.b : scores.a;
  const myName = player?.name || 'You';
  const oppName = myRole === 'a' ? sessionInfo?.playerBName : sessionInfo?.playerAName;

  const iWon = gameOver && String(gameOver.winnerId) === String(player?.id);

  return (
    <div className="rps-page">
      {/* Countdown overlay — appears on top after both players pick */}
      {countdownStep && <CountdownReveal step={countdownStep} />}

      {/* Scores header */}
      <div className="rps-header">
        <div className="rps-score-side">
          <StarScore score={myScore} total={3} label={myName} />
        </div>
        <div className="rps-round-info">
          {phase !== PHASE.GAME_OVER && (
            <span className="rps-round-badge">Round {currentRound}</span>
          )}
          {phase === PHASE.GAME_OVER && (
            <span className="rps-round-badge rps-round-badge--over">Game Over!</span>
          )}
        </div>
        <div className="rps-score-side">
          <StarScore score={oppScore} total={3} label={oppName || 'Opponent'} />
        </div>
      </div>

      {/* Main game area */}
      <div className="rps-main">

        {/* Connecting / waiting for opponent to join */}
        {phase === PHASE.CONNECTING && (
          <div className="rps-status">
            <div className="waiting-dots"><span /><span /><span /></div>
            <p>Waiting for opponent...</p>
          </div>
        )}

        {/* CHOOSING and WAITING both show the choice buttons */}
        {(phase === PHASE.CHOOSING || phase === PHASE.WAITING) && (
          <>
            <p className="rps-choose-hint">
              {phase === PHASE.CHOOSING
                ? 'Choose your move! 👇'
                : `Waiting for ${oppName || 'opponent'}... 🤔`}
            </p>
            <div className="rps-choices">
              {['rock', 'paper', 'scissors'].map((choice) => (
                <GameChoiceButton
                  key={choice}
                  choice={choice}
                  onSelect={handleChoose}
                  selected={myMove === choice}
                  disabled={phase === PHASE.WAITING}
                />
              ))}
            </div>
            {phase === PHASE.WAITING && (
              <div className="waiting-dots"><span /><span /><span /></div>
            )}
          </>
        )}

        {/* Reveal */}
        {phase === PHASE.REVEAL && reveal && (
          <div className="rps-reveal-area">
            <ResultBanner
              result={reveal.result}
              myRole={myRole}
              moveA={reveal.moveA}
              moveB={reveal.moveB}
              myName={myName}
              opponentName={oppName}
            />
          </div>
        )}

        {/* Game over */}
        {phase === PHASE.GAME_OVER && gameOver && (
          <div className="rps-game-over">
            <div className="rps-game-over-trophy">{iWon ? '🏆' : '🥈'}</div>
            <h2 className="rps-game-over-title">
              {iWon ? 'You Win! 🎉' : `${gameOver.winnerName} Wins!`}
            </h2>
            <div className="rps-final-scores">
              <div className="rps-final-score-row">
                <StarScore score={myScore} total={3} label={myName} />
                <span className="rps-final-vs">VS</span>
                <StarScore score={oppScore} total={3} label={oppName || 'Opponent'} />
              </div>
            </div>

            <div className="rps-play-again-area">
              {/* idle: show the Play Again button */}
              {playAgainState === 'idle' && (
                <button className="btn btn-primary btn-xl btn-full" onClick={handlePlayAgainRequest}>
                  Play Again! 🔁
                </button>
              )}

              {/* waiting: I asked, waiting for their answer */}
              {playAgainState === 'waiting' && (
                <div className="rps-waiting-vote">
                  <div className="waiting-dots"><span /><span /><span /></div>
                  <p>Waiting for {oppName || 'opponent'}...</p>
                </div>
              )}

              {/* asked: opponent wants to play again — show accept/decline */}
              {playAgainState === 'asked' && (
                <div className="rps-rematch-request">
                  <p className="rps-rematch-msg">
                    <strong>{playAgainAsker}</strong> wants a rematch!
                  </p>
                  <button className="btn btn-success btn-xl btn-full" onClick={handlePlayAgainAccept}>
                    ✅ Yes, let's go!
                  </button>
                  <button className="btn btn-outline btn-full" onClick={handlePlayAgainDecline}>
                    😴 Sorry, not now
                  </button>
                </div>
              )}

              {/* declined: opponent said no */}
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
