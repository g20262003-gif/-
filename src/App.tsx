import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Flame,
  Layers,
  Sparkles,
  Info,
  HelpCircle,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';

import {
  COLS,
  ROWS,
  TETROMINOES,
  RAINBOW_GRADIENTS,
  BoardMatrix,
  Tetromino,
  TetrominoType,
  GameStats,
  Particle,
  Point,
} from './types';

import {
  playMove,
  playRotate,
  playDrop,
  playHold,
  playLineClear,
  playLevelUp,
  playGameOver,
  setMuted,
  getMuted,
} from './utils/audio';

import TetrisBoard from './components/TetrisBoard';
import TetrisControls from './components/TetrisControls';

// Helper to create an empty board matrix
const createEmptyBoard = (): BoardMatrix =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(0));

// Speed calculation per level (ms)
const getSpeed = (level: number): number => {
  const speeds = [800, 700, 600, 500, 420, 350, 280, 200, 130, 90];
  return speeds[Math.min(level - 1, speeds.length - 1)];
};

export default function App() {
  // --- STATE ---
  const [board, setBoard] = useState<BoardMatrix>(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<Tetromino | null>(null);
  const [nextPiece, setNextPiece] = useState<Tetromino | null>(null);
  const [holdPiece, setHoldPiece] = useState<Tetromino | null>(null);
  const [canHold, setCanHold] = useState(true);

  const [isPaused, setIsPaused] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isFirstGame, setIsFirstGame] = useState(true);
  const [showHowTo, setShowHowTo] = useState(false);

  const [stats, setStats] = useState<GameStats>({
    score: 0,
    lines: 0,
    level: 1,
    highScore: 0,
  });

  const [clearingLines, setClearingLines] = useState<number[]>([]);
  const [rainbowFever, setRainbowFever] = useState(false);
  const [isMutedState, setIsMutedState] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  // --- REFS ---
  const particlesRef = useRef<Particle[]>([]);
  const gravityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSoftDroppingRef = useRef(false);
  const statsRef = useRef(stats);
  const boardRef = useRef(board);
  const currentPieceRef = useRef(currentPiece);
  const isPausedRef = useRef(isPaused);
  const isGameOverRef = useRef(isGameOver);

  // Sync refs to prevent stale closure loops
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    currentPieceRef.current = currentPiece;
  }, [currentPiece]);

  useEffect(() => {
    isPausedRef.current = isPaused;
    isGameOverRef.current = isGameOver;
  }, [isPaused, isGameOver]);

  // Load high score and volume settings from local storage
  useEffect(() => {
    const savedHighScore = localStorage.getItem('rainbow_tetris_highscore');
    if (savedHighScore) {
      setStats((prev) => ({ ...prev, highScore: parseInt(savedHighScore, 10) }));
    }

    const savedMuted = localStorage.getItem('rainbow_tetris_muted');
    if (savedMuted === 'true') {
      setMuted(true);
      setIsMutedState(true);
    }
  }, []);

  // --- AUDIO ACTIONS ---
  const toggleMute = () => {
    const nextMuted = !isMutedState;
    setMuted(nextMuted);
    setIsMutedState(nextMuted);
    localStorage.setItem('rainbow_tetris_muted', nextMuted ? 'true' : 'false');
  };

  // --- PARTICLE PHYSICS SIMULATOR ---
  useEffect(() => {
    let animId: number;

    const updateParticles = () => {
      if (particlesRef.current.length > 0) {
        particlesRef.current = particlesRef.current
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.08, // mild gravity pull downwards
            alpha: p.alpha - 0.02, // fade out
            life: p.life + 1,
          }))
          .filter((p) => p.alpha > 0 && p.life < p.maxLife);

        setParticles([...particlesRef.current]);
      }
      animId = requestAnimationFrame(updateParticles);
    };

    animId = requestAnimationFrame(updateParticles);
    return () => cancelAnimationFrame(animId);
  }, []);

  const spawnLineClearParticles = (rowIdx: number, colorIdx: number) => {
    const gradientColors = RAINBOW_GRADIENTS[colorIdx] || RAINBOW_GRADIENTS[1];
    const newParticles: Particle[] = [];

    // Spawn burst effects across columns
    for (let c = 0; c < COLS; c++) {
      const px = c + 0.5; // center of block column
      const py = rowIdx + 0.5; // center of row

      // 4 particles per cell
      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.05 + Math.random() * 0.15;
        newParticles.push({
          id: Math.random() + c * 100,
          x: px,
          y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.05, // direct upwards slightly
          color: gradientColors[Math.floor(Math.random() * gradientColors.length)],
          size: 1.5 + Math.random() * 2.5,
          alpha: 1,
          life: 0,
          maxLife: 20 + Math.random() * 20,
        });
      }
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];
    setParticles([...particlesRef.current]);
  };

  // --- TETRIS LOGIC ENGINE ---

  const getRandomPieceType = (): TetrominoType => {
    const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    return types[Math.floor(Math.random() * types.length)];
  };

  const createPiece = (type: TetrominoType, startX = 3, startY = -1): Tetromino => {
    const config = TETROMINOES[type];
    return {
      type,
      matrix: JSON.parse(JSON.stringify(config.matrix)),
      colorIndex: config.colorIndex,
      position: { x: startX, y: startY },
    };
  };

  const checkCollision = useCallback(
    (piece: Tetromino, currentBoard: BoardMatrix, offset: Point = { x: 0, y: 0 }): boolean => {
      const { matrix, position } = piece;
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c] > 0) {
            const nextX = position.x + c + offset.x;
            const nextY = position.y + r + offset.y;

            // Lateral bounds
            if (nextX < 0 || nextX >= COLS) {
              return true;
            }
            // Bottom bound
            if (nextY >= ROWS) {
              return true;
            }
            // Existing placed blocks
            if (nextY >= 0 && currentBoard[nextY][nextX] > 0) {
              return true;
            }
          }
        }
      }
      return false;
    },
    []
  );

  // Compute ghost drop landing position
  const getGhostPosition = useCallback((): Point | null => {
    const piece = currentPieceRef.current;
    if (!piece) return null;

    const ghost = { ...piece, position: { ...piece.position } };
    while (!checkCollision(ghost, boardRef.current, { x: 0, y: 1 })) {
      ghost.position.y++;
    }
    return ghost.position;
  }, [checkCollision]);

  // Wall-Kicked Rotation with SRS
  const rotate = () => {
    if (isPausedRef.current || isGameOverRef.current || !currentPieceRef.current) return;

    const piece = currentPieceRef.current;
    const n = piece.matrix.length;
    const rotatedMatrix = Array.from({ length: n }, () => Array(n).fill(0));

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        rotatedMatrix[c][n - 1 - r] = piece.matrix[r][c];
      }
    }

    const rotatedPiece: Tetromino = {
      ...piece,
      matrix: rotatedMatrix,
    };

    // SRS/Wall Kick offsets
    const kicks = [
      { x: 0, y: 0 },   // normal
      { x: -1, y: 0 },  // 1 left
      { x: 1, y: 0 },   // 1 right
      { x: -2, y: 0 },  // 2 left (mainly for I piece)
      { x: 2, y: 0 },   // 2 right (mainly for I piece)
      { x: 0, y: -1 },  // floor kick up 1
    ];

    for (const kick of kicks) {
      if (!checkCollision(rotatedPiece, boardRef.current, kick)) {
        setCurrentPiece({
          ...rotatedPiece,
          position: {
            x: piece.position.x + kick.x,
            y: piece.position.y + kick.y,
          },
        });
        playRotate();
        return;
      }
    }
  };

  const moveLeft = () => {
    if (isPausedRef.current || isGameOverRef.current || !currentPieceRef.current) return;
    if (!checkCollision(currentPieceRef.current, boardRef.current, { x: -1, y: 0 })) {
      setCurrentPiece((prev) => prev && { ...prev, position: { ...prev.position, x: prev.position.x - 1 } });
      playMove();
    }
  };

  const moveRight = () => {
    if (isPausedRef.current || isGameOverRef.current || !currentPieceRef.current) return;
    if (!checkCollision(currentPieceRef.current, boardRef.current, { x: 1, y: 0 })) {
      setCurrentPiece((prev) => prev && { ...prev, position: { ...prev.position, x: prev.position.x + 1 } });
      playMove();
    }
  };

  const hold = () => {
    if (isPausedRef.current || isGameOverRef.current || !currentPieceRef.current || !canHold) return;

    playHold();
    const typeToHold = currentPieceRef.current.type;

    if (!holdPiece) {
      // First hold of the game
      setHoldPiece(createPiece(typeToHold));
      const next = nextPiece || createPiece(getRandomPieceType());
      setCurrentPiece(next);
      setNextPiece(createPiece(getRandomPieceType()));
    } else {
      // Swap hold
      const temp = holdPiece;
      setHoldPiece(createPiece(typeToHold));
      // Put the held piece back active at the top spawning position
      setCurrentPiece(createPiece(temp.type));
    }

    setCanHold(false);
  };

  const mergePiece = (piece: Tetromino, currentBoard: BoardMatrix) => {
    let newBoard = currentBoard.map((row) => [...row]);
    const { matrix, position, colorIndex } = piece;

    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] > 0) {
          const boardY = position.y + r;
          const boardX = position.x + c;
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            newBoard[boardY][boardX] = colorIndex;
          }
        }
      }
    }

    // Identify full rows
    const fullRows: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (newBoard[r].every((val) => val > 0)) {
        fullRows.push(r);
      }
    }

    if (fullRows.length > 0) {
      // Stop timer & trigger clear sequence
      setClearingLines(fullRows);
      playLineClear(fullRows.length);

      // Trigger particle explosions at the cleared cells
      fullRows.forEach((r) => {
        // Find first block color to decide particle hues
        const sampleColorIdx = newBoard[r].find((val) => val > 0) || 1;
        spawnLineClearParticles(r, sampleColorIdx);
      });

      // Clear animation delay: 350ms
      setTimeout(() => {
        // Collapse board rows
        const filteredBoard = newBoard.filter((_, idx) => !fullRows.includes(idx));
        const emptyRowsNeeded = ROWS - filteredBoard.length;
        const prependEmptyRows = Array.from({ length: emptyRowsNeeded }, () => Array(COLS).fill(0));
        const collapsedBoard = [...prependEmptyRows, ...filteredBoard];

        // Scoring rules
        const baseScores = [0, 100, 300, 500, 800];
        let scoreReward = baseScores[Math.min(fullRows.length, 4)] * statsRef.current.level;

        // Fever multiplier
        const isTetrisClear = fullRows.length >= 4;
        if (isTetrisClear) {
          setRainbowFever(true);
          scoreReward = scoreReward * 2.5; // Massive reward for full Tetris
          // Fever fades after 6 seconds
          setTimeout(() => {
            setRainbowFever(false);
          }, 6000);
        } else if (rainbowFever) {
          scoreReward = scoreReward * 2; // All clears are doubled during Fever
        }

        const nextScore = statsRef.current.score + scoreReward;
        const nextLines = statsRef.current.lines + fullRows.length;
        const nextLevel = Math.floor(nextLines / 10) + 1;

        if (nextLevel > statsRef.current.level) {
          playLevelUp();
        }

        const updatedHighScore = Math.max(nextScore, statsRef.current.highScore);
        if (updatedHighScore > statsRef.current.highScore) {
          localStorage.setItem('rainbow_tetris_highscore', updatedHighScore.toString());
        }

        setStats((prev) => ({
          score: nextScore,
          lines: nextLines,
          level: nextLevel,
          highScore: updatedHighScore,
        }));

        setBoard(collapsedBoard);
        setClearingLines([]);
        spawnNext(collapsedBoard);
      }, 350);
    } else {
      playDrop();
      spawnNext(newBoard);
    }
  };

  const spawnNext = (currentBoard: BoardMatrix) => {
    const next = nextPiece || createPiece(getRandomPieceType());
    const subsequent = createPiece(getRandomPieceType());

    // Game Over Check
    if (checkCollision(next, currentBoard)) {
      handleGameOver();
      return;
    }

    setBoard(currentBoard);
    setCurrentPiece(next);
    setNextPiece(subsequent);
    setCanHold(true);
  };

  const handleGameOver = () => {
    setIsGameOver(true);
    setIsPaused(true);
    setCurrentPiece(null);
    playGameOver();
  };

  // Move the piece down by 1 row
  const drop = useCallback(() => {
    if (isPausedRef.current || isGameOverRef.current || !currentPieceRef.current) return;

    const piece = currentPieceRef.current;
    if (!checkCollision(piece, boardRef.current, { x: 0, y: 1 })) {
      setCurrentPiece({
        ...piece,
        position: { ...piece.position, y: piece.position.y + 1 },
      });
      // Soft dropping gives extra small points
      if (isSoftDroppingRef.current) {
        setStats((prev) => ({ ...prev, score: prev.score + 1 }));
      }
    } else {
      mergePiece(piece, boardRef.current);
    }
  }, [checkCollision]);

  // Soft dropping speed handlers
  const startSoftDrop = () => {
    isSoftDroppingRef.current = true;
    restartGravityTimer(35); // accelerate downwards to 35ms drop speeds!
  };

  const stopSoftDrop = () => {
    isSoftDroppingRef.current = false;
    restartGravityTimer();
  };

  // Instant hard drop
  const hardDrop = () => {
    if (isPausedRef.current || isGameOverRef.current || !currentPieceRef.current) return;

    const piece = currentPieceRef.current;
    let dropRows = 0;
    const ghost = { ...piece, position: { ...piece.position } };

    while (!checkCollision(ghost, boardRef.current, { x: 0, y: 1 })) {
      ghost.position.y++;
      dropRows++;
    }

    // Award hard drop score bonus
    setStats((prev) => {
      const bonus = dropRows * 2;
      const nextScore = prev.score + bonus;
      const nextHighScore = Math.max(nextScore, prev.highScore);
      if (nextHighScore > prev.highScore) {
        localStorage.setItem('rainbow_tetris_highscore', nextHighScore.toString());
      }
      return { ...prev, score: nextScore, highScore: nextHighScore };
    });

    // Merge instantly at ghost landing coords
    mergePiece(ghost, boardRef.current);
  };

  // Manage gravity speed intervals
  const restartGravityTimer = useCallback((customSpeed?: number) => {
    if (gravityTimerRef.current) {
      clearInterval(gravityTimerRef.current);
    }

    if (isPausedRef.current || isGameOverRef.current) return;

    const activeSpeed = customSpeed || getSpeed(statsRef.current.level);
    gravityTimerRef.current = setInterval(() => {
      drop();
    }, activeSpeed);
  }, [drop]);

  // Sync timer when state switches
  useEffect(() => {
    if (!isPaused && !isGameOver) {
      restartGravityTimer(isSoftDroppingRef.current ? 35 : undefined);
    } else {
      if (gravityTimerRef.current) {
        clearInterval(gravityTimerRef.current);
      }
    }
    return () => {
      if (gravityTimerRef.current) clearInterval(gravityTimerRef.current);
    };
  }, [isPaused, isGameOver, restartGravityTimer]);

  // Reset & restart the full game
  const startGame = () => {
    setBoard(createEmptyBoard());
    const firstPiece = createPiece(getRandomPieceType());
    const secondPiece = createPiece(getRandomPieceType());
    setCurrentPiece(firstPiece);
    setNextPiece(secondPiece);
    setHoldPiece(null);
    setCanHold(true);
    setRainbowFever(false);
    setStats((prev) => ({
      score: 0,
      lines: 0,
      level: 1,
      highScore: prev.highScore,
    }));
    setIsPaused(false);
    setIsGameOver(false);
    setIsFirstGame(false);
    playLevelUp(); // Play level up sound as starting celebration fanfare
  };

  const togglePause = () => {
    if (isGameOver) return;
    setIsPaused((prev) => !prev);
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling on arrow keys and space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.repeat) {
        // Prevent rotation or hard drop repeating uncontrollably
        if (['ArrowUp', 'Space', 'KeyC', 'ShiftLeft', 'ShiftRight'].includes(e.code)) return;
      }

      switch (e.code) {
        case 'ArrowLeft':
          moveLeft();
          break;
        case 'ArrowRight':
          moveRight();
          break;
        case 'ArrowDown':
          startSoftDrop();
          break;
        case 'ArrowUp':
          rotate();
          break;
        case 'Space':
          hardDrop();
          break;
        case 'KeyC':
        case 'ShiftLeft':
        case 'ShiftRight':
          hold();
          break;
        case 'KeyP':
        case 'Escape':
          togglePause();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown') {
        stopSoftDrop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [canHold]); // depends on canHold to refresh swapping lock

  // --- RENDERING AUXILIARY BOXES ---
  const renderMiniPreview = (piece: Tetromino | null, label: string) => {
    return (
      <div className="bg-black border-2 border-white rounded-none p-4 flex flex-col items-center justify-center shadow-md relative overflow-hidden group">
        <span className="text-[10px] tracking-widest font-mono font-black text-white mb-3 uppercase">
          {label}
        </span>
        <div className="w-16 h-16 flex items-center justify-center">
          {piece ? (
            <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${piece.matrix[0].length}, minmax(0, 1fr))` }}>
              {piece.matrix.map((row, r) =>
                row.map((cell, c) => {
                  const gradient = RAINBOW_GRADIENTS[piece.colorIndex] || RAINBOW_GRADIENTS[1];
                  return (
                    <div
                      key={`${r}-${c}`}
                      className="w-4 h-4 transition-all"
                      style={{
                        background: cell > 0 ? `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` : 'transparent',
                        border: cell > 0 ? '1.5px solid #ffffff' : 'none',
                      }}
                    />
                  );
                })
              )}
            </div>
          ) : (
            <span className="text-xs font-mono text-gray-500 font-bold">EMPTY</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-between font-sans relative overflow-x-hidden pb-6">
      {/* Absolute Ambient Pulsing Backlight */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div
          className="absolute -top-[10%] left-[50%] -translate-x-[50%] w-[120%] h-[40%] rounded-full blur-[120px] opacity-10 transition-all duration-1000"
          style={{
            background: rainbowFever
              ? 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b00ff)'
              : 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(0,0,0,0) 70%)',
          }}
        />
      </div>

      {/* RAINBOW FEVER FLASHER OVERLAY */}
      <AnimatePresence>
        {rainbowFever && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.06 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-0 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 animate-pulse pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* HEADER SECTION - BOLD RETRO */}
      <header className="w-full max-w-5xl px-4 py-6 flex justify-between items-center z-10 border-b-4 border-white mb-4 bg-black">
        <div className="flex flex-col">
          <h1 className="text-3xl md:text-5xl font-display font-black tracking-tighter flex flex-col md:flex-row items-baseline gap-1 select-none">
            <span className="bold-rainbow-title text-4xl md:text-6xl font-black italic">RAINBOW</span>
            <span className="text-white font-black tracking-widest font-mono text-xl md:text-2xl uppercase">TETRIS</span>
          </h1>
          <span className="text-[10px] md:text-xs text-white font-mono uppercase tracking-widest mt-1.5 opacity-80">
            ★ PERFECT FOR WEB, MOBILE & GITHUB HOSTING ★
          </span>
        </div>

        {/* Global Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowHowTo((prev) => !prev)}
            className="p-3 bg-black border-2 border-white text-white hover:bg-white hover:text-black transition-all shadow-md active:scale-95 font-black flex items-center gap-1.5 text-xs"
            title="How to Play"
          >
            <HelpCircle className="w-5 h-5" />
            <span className="hidden sm:inline">GUIDE</span>
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT WRAPPER */}
      <main className="w-full max-w-5xl px-4 flex-grow flex flex-col justify-center gap-6 z-10">
        {/* Game is not started yet screen */}
        {isFirstGame ? (
          <div className="flex flex-col items-center justify-center max-w-md mx-auto my-auto text-center p-8 bg-black border-4 border-white shadow-[0_0_25px_rgba(255,255,255,0.2)] relative overflow-hidden">
            {/* Rainbow pulses border */}
            <div className="absolute inset-0 pointer-events-none border border-white/20" />

            <div className="w-20 h-20 rounded-none border-4 border-white bg-black flex items-center justify-center shadow-lg mb-6 animate-pulse">
              <Sparkles className="w-10 h-10 text-white fill-white/20" />
            </div>

            <h2 className="text-4xl font-display font-black tracking-tighter text-white mb-2 uppercase italic">
              무지개 테트리스
            </h2>
            <p className="text-xs font-mono text-gray-400 mb-6 uppercase tracking-wider leading-relaxed">
              VIBRANT RAINBOW COLORS, CHUNKY RETRO CONTROLS, WEB AUDIO SYNTH SOUNDS, AND EXPLOSIVE ACTION.
            </p>

            <button
              onClick={startGame}
              className="w-full py-4 px-8 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 text-white font-black text-xl border-4 border-white hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            >
              START GAME
            </button>

            {/* Quick How to play */}
            <div className="mt-6 pt-5 border-t-2 border-white/30 text-left w-full">
              <h3 className="text-xs font-mono text-white font-black mb-3 uppercase flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-yellow-400" /> KEYBOARD SHORTCUTS
              </h3>
              <ul className="text-[11px] text-gray-400 font-mono space-y-1">
                <li><span className="text-white font-bold">← / →</span> : MOVE PIECE</li>
                <li><span className="text-white font-bold">↑</span> : ROTATE BLOCK</li>
                <li><span className="text-white font-bold">↓</span> : SOFT DROP</li>
                <li><span className="text-white font-bold">SPACE</span> : HARD DROP</li>
                <li><span className="text-white font-bold">SHIFT / C</span> : HOLD BLOCK</li>
                <li><span className="text-white font-bold">P / ESC</span> : PAUSE GAME</li>
              </ul>
            </div>
          </div>
        ) : (
          /* ACTIVE GAME SCREEN */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT SIDEBAR: Hold & Controls Guide (Desktop only, hidden on mobile) */}
            <div className="hidden lg:flex lg:col-span-3 flex-col gap-4">
              {renderMiniPreview(holdPiece, 'HOLDING')}

              {/* Statistics sidebar box */}
              <div className="bg-black border-2 border-white rounded-none p-4 flex flex-col gap-3 shadow-md relative overflow-hidden">
                <span className="text-[10px] tracking-widest font-mono font-black text-white uppercase border-b border-white/30 pb-1.5">
                  ACTIVE STATS
                </span>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black border border-white">
                    <Flame className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-gray-400">LEVEL</span>
                    <span className="text-xl font-display font-black text-purple-400">{stats.level}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black border border-white">
                    <Layers className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-gray-400">LINES CLEARED</span>
                    <span className="text-xl font-display font-black text-emerald-400">{stats.lines}</span>
                  </div>
                </div>
              </div>

              {/* Help tip */}
              <div className="bg-black border-2 border-white rounded-none p-4 text-xs text-white font-mono leading-relaxed">
                <span className="text-yellow-400 font-black block mb-1">PRO-TIP:</span>
                Clear <span className="text-pink-400 font-extrabold">4 lines simultaneously</span> to trigger <span className="rainbow-text font-black">RAINBOW FEVER</span> for a <span className="text-white font-black">2.5x SCORE MULTIPLIER</span>!
              </div>
            </div>

            {/* CENTER: The Main Canvas Board (Both Mobile and Desktop) */}
            <div className="col-span-1 lg:col-span-6 flex flex-col items-center">
              {/* Mobile Quick Stats Bar (Hidden on Desktop) */}
              <div className="flex lg:hidden justify-between w-full max-w-sm mb-3 bg-black px-4 py-2.5 rounded-none border-2 border-white text-xs font-mono shadow-md">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-gray-400 font-black">SCORE</span>
                  <span className="text-sm font-black text-sky-400">{stats.score}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-gray-400 font-black">LEVEL</span>
                  <span className="text-sm font-black text-purple-400">{stats.level}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-gray-400 font-black">LINES</span>
                  <span className="text-sm font-black text-emerald-400">{stats.lines}</span>
                </div>
                <div className="flex flex-col items-center border-l-2 border-white/30 pl-3">
                  <span className="text-[9px] text-gray-400 font-black">NEXT</span>
                  <div className="w-4 h-4 flex items-center justify-center mt-0.5">
                    {nextPiece && (
                      <span className="text-[10px] font-black text-pink-400">{nextPiece.type}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-gray-400 font-black">HOLD</span>
                  <div className="w-4 h-4 flex items-center justify-center mt-0.5">
                    <span className="text-[10px] font-black text-amber-400">
                      {holdPiece ? holdPiece.type : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Board wrapper holding dynamic heights */}
              <div className="w-full max-w-sm h-[52vh] sm:h-[58vh] lg:h-[65vh]">
                <TetrisBoard
                  board={board}
                  currentPiece={currentPiece}
                  ghostPosition={getGhostPosition()}
                  particles={particles}
                  rainbowFever={rainbowFever}
                  isPaused={isPaused}
                  isGameOver={isGameOver}
                  clearingLines={clearingLines}
                />
              </div>

              {/* Mobile Only Space Indicator */}
              <div className="mt-4 lg:hidden w-full max-w-md">
                <TetrisControls
                  onMoveLeft={moveLeft}
                  onMoveRight={moveRight}
                  onRotate={rotate}
                  onStartSoftDrop={startSoftDrop}
                  onStopSoftDrop={stopSoftDrop}
                  onHardDrop={hardDrop}
                  onHold={hold}
                  isPaused={isPaused}
                  isGameOver={isGameOver}
                  isMuted={isMutedState}
                  onToggleMute={toggleMute}
                  onTogglePause={togglePause}
                  onRestart={startGame}
                />
              </div>
            </div>

            {/* RIGHT SIDEBAR: Score, Next Piece Queue, Highscore (Desktop only, hidden on mobile) */}
            <div className="hidden lg:flex lg:col-span-3 flex-col gap-4">
              {renderMiniPreview(nextPiece, 'UP NEXT')}

              {/* Dynamic Scoreboard Box */}
              <div className="bg-black border-2 border-white rounded-none p-4 flex flex-col gap-4 shadow-md relative overflow-hidden">
                <span className="text-[10px] tracking-widest font-mono font-black text-white uppercase border-b border-white/30 pb-1.5">
                  SCOREBOARD
                </span>

                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-gray-400 uppercase">TOTAL SCORE</span>
                  <span className="text-4xl font-display font-black text-sky-400 tracking-tighter">
                    {stats.score}
                  </span>
                </div>

                <div className="flex items-center gap-3 border-t-2 border-white/30 pt-3">
                  <div className="p-2 bg-black border border-white">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-gray-400 uppercase">HIGH SCORE</span>
                    <span className="text-xl font-display font-black text-yellow-300">{stats.highScore}</span>
                  </div>
                </div>
              </div>

              {/* Desktop Gameplay action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={togglePause}
                  disabled={isGameOver}
                  className="py-3 px-4 bg-black border-2 border-white text-xs font-black uppercase text-white hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2"
                >
                  {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
                <button
                  onClick={startGame}
                  className="py-3 px-4 bg-black border-2 border-white text-xs font-black uppercase text-pink-400 hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restart</span>
                </button>
              </div>

              <div className="flex justify-between items-center bg-black border-2 border-white px-4 py-2.5 text-xs font-mono">
                <span className="text-[10px] uppercase font-black text-white">SYNTH AUDIO</span>
                <button
                  onClick={toggleMute}
                  className="p-1 border border-transparent hover:border-white active:bg-white active:text-black transition-all"
                >
                  {isMutedState ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="w-full max-w-5xl text-center py-4 mt-6 border-t-4 border-white text-[10px] text-white uppercase font-black tracking-widest z-10">
        © 2026 Rainbow Tetris. All Rights Reserved. Designed for Mobile & Desktop.
      </footer>

      {/* HOW TO PLAY PANEL MODAL */}
      <AnimatePresence>
        {showHowTo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#000]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-black border-4 border-white rounded-none p-6 max-w-md w-full relative shadow-2xl"
            >
              <h2 className="text-xl font-display font-black text-white mb-4 flex items-center gap-2 uppercase italic">
                <Sparkles className="w-5 h-5 text-purple-400 fill-current" />
                HOW TO PLAY
              </h2>

              <div className="space-y-4 text-xs font-mono text-gray-300 leading-relaxed">
                <div>
                  <p className="font-black text-sky-400 mb-1">🎮 GAME OBJECTIVE:</p>
                  <p className="text-gray-400 uppercase">
                    Arrange the falling blocks to fill complete horizontal lines. Filled lines disappear and earn you scores. If blocks pile up to the top, it is Game Over!
                  </p>
                </div>

                <div>
                  <p className="font-black text-purple-400 mb-1">⌨️ KEYBOARD SHORTCUTS:</p>
                  <ul className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-gray-400 uppercase">
                    <li><span className="text-white font-black">← / →</span>: MOVE</li>
                    <li><span className="text-white font-black">↑</span>: ROTATE</li>
                    <li><span className="text-white font-black">↓</span>: SOFT DROP</li>
                    <li><span className="text-white font-black">SPACE</span>: HARD DROP</li>
                    <li><span className="text-white font-black">SHIFT / C</span>: HOLD PIECE</li>
                    <li><span className="text-white font-black">P / ESC</span>: PAUSE GAME</li>
                  </ul>
                </div>

                <div>
                  <p className="font-black text-pink-400 mb-1">📱 MOBILE EXPERIENCE:</p>
                  <p className="text-gray-400 uppercase">
                    Turn your device to portrait. Comfortable big thumb triggers are placed at the bottom. Hold down the "SOFT" button to drop blocks rapidly, and tap "HARD" to drop instantly.
                  </p>
                </div>

                <div>
                  <p className="font-black text-yellow-400 mb-1">🌈 SPECIAL FEATURE: RAINBOW FEVER</p>
                  <p className="text-gray-400 uppercase">
                    Clearing a "Tetris" (4 lines at once) triggers the <span className="rainbow-text font-black">RAINBOW FEVER</span> mode for 6 seconds! Watch the screen glow, see rainbow sparks fly, and earn double points!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowHowTo(false)}
                className="mt-6 w-full py-3 bg-black border-2 border-white text-white font-black uppercase text-xs tracking-wider hover:bg-white hover:text-black transition-all rounded-none"
              >
                Got it, Let's Play!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
