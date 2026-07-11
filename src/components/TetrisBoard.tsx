import { useEffect, useRef, useState } from 'react';
import {
  COLS,
  ROWS,
  RAINBOW_GRADIENTS,
  BoardMatrix,
  Tetromino,
  Particle,
  Point,
} from '../types';

interface TetrisBoardProps {
  board: BoardMatrix;
  currentPiece: Tetromino | null;
  ghostPosition: Point | null;
  particles: Particle[];
  rainbowFever: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  clearingLines: number[]; // Row indices that are currently in the middle of clearing animation
}

export default function TetrisBoard({
  board,
  currentPiece,
  ghostPosition,
  particles,
  rainbowFever,
  isPaused,
  isGameOver,
  clearingLines,
}: TetrisBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blockSize, setBlockSize] = useState(25);
  const [hueShift, setHueShift] = useState(0);

  // Cycle hues for the rainbow fever mode and glowing borders
  useEffect(() => {
    let animId: number;
    const updateHue = () => {
      setHueShift((prev) => (prev + 1.5) % 360);
      animId = requestAnimationFrame(updateHue);
    };
    animId = requestAnimationFrame(updateHue);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Handle resizing the board to be fully responsive
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      // Calculate block size to fit the board (10 cols x 20 rows) within container bounds
      const maxBlockW = Math.floor(rect.width / COLS);
      const maxBlockH = Math.floor(rect.height / ROWS);
      const size = Math.max(15, Math.min(maxBlockW, maxBlockH, 40)); // keep within bounds
      setBlockSize(size);
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);
    handleResize(); // trigger initial layout

    return () => observer.disconnect();
  }, []);

  // Main rendering loop for canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = COLS * blockSize;
    const height = ROWS * blockSize;

    // Set display and internal high-DPI scaling
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    // DRAW BACKGROUND
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // DRAW GRID LINES (Chunky retro grid)
    ctx.strokeStyle = '#1a1a1c';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * blockSize, 0);
      ctx.lineTo(c * blockSize, height);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * blockSize);
      ctx.lineTo(width, r * blockSize);
      ctx.stroke();
    }

    // DRAW SHADOW GRID GLOW (If Rainbow Fever is active)
    if (rainbowFever) {
      ctx.fillStyle = `hsla(${hueShift}, 90%, 8%, 0.25)`;
      ctx.fillRect(0, 0, width, height);
    }

    // HELPER: DRAW BOLD HIGH-CONTRAST BLOCK
    const drawBlock = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      colorIdx: number,
      opacity = 1,
      isGhost = false
    ) => {
      const gradientColors = RAINBOW_GRADIENTS[colorIdx] || RAINBOW_GRADIENTS[1];
      const px = x * blockSize;
      const py = y * blockSize;

      if (isGhost) {
        // Draw outline for ghost piece
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, 0.35)`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(px + 1.5, py + 1.5, blockSize - 3, blockSize - 3);

        // Subtle glow fill
        ctx.fillStyle = `rgba(255, 255, 255, 0.05)`;
        ctx.fillRect(px + 1.5, py + 1.5, blockSize - 3, blockSize - 3);
        ctx.restore();
        return;
      }

      ctx.save();
      ctx.globalAlpha = opacity;

      // Solid color / vibrant gradient fill
      const grad = ctx.createLinearGradient(px, py, px, py + blockSize);
      grad.addColorStop(0, gradientColors[0]);
      grad.addColorStop(1, gradientColors[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(px + 1, py + 1, blockSize - 2, blockSize - 2);

      // Chunky high contrast white stroke
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 1, py + 1, blockSize - 2, blockSize - 2);

      // Inner dark accent border for retro feel
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 2.5, py + 2.5, blockSize - 5, blockSize - 5);

      ctx.restore();
    };

    // DRAW PLACED BLOCKS ON BOARD
    for (let r = 0; r < ROWS; r++) {
      const isClearing = clearingLines.includes(r);
      for (let c = 0; c < COLS; c++) {
        const val = board[r][c];
        if (val > 0) {
          if (isClearing) {
            // Draw clearing flash effect
            ctx.save();
            ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + Math.sin(Date.now() / 30) * 0.3})`;
            ctx.fillRect(c * blockSize, r * blockSize, blockSize, blockSize);
            // Draw fading outline
            ctx.strokeStyle = `hsla(${(hueShift + c * 30) % 360}, 100%, 70%, 1)`;
            ctx.lineWidth = 2;
            ctx.strokeRect(c * blockSize + 1, r * blockSize + 1, blockSize - 2, blockSize - 2);
            ctx.restore();
          } else {
            drawBlock(ctx, c, r, val);
          }
        }
      }
    }

    // DRAW GHOST PIECE (Glow outline showing where current piece lands)
    if (currentPiece && ghostPosition) {
      const { matrix, colorIndex } = currentPiece;
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c] > 0) {
            const gx = ghostPosition.x + c;
            const gy = ghostPosition.y + r;
            // Only draw if within bounds
            if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
              drawBlock(ctx, gx, gy, colorIndex, 0.45, true);
            }
          }
        }
      }
    }

    // DRAW CURRENT ACTIVE PIECE
    if (currentPiece) {
      const { matrix, colorIndex, position } = currentPiece;
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c] > 0) {
            const px = position.x + c;
            const py = position.y + r;
            if (py >= 0 && py < ROWS && px >= 0 && px < COLS) {
              // Pulse the active piece slightly if rainbow fever is on
              const opacity = rainbowFever ? 0.9 + Math.sin(Date.now() / 100) * 0.1 : 1;
              drawBlock(ctx, px, py, colorIndex, opacity);
            }
          }
        }
      }
    }

    // DRAW PARTICLES ON THE BOARD (Clear Line Explosion Effects)
    particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      // Glow effect for particles
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;

      ctx.beginPath();
      ctx.arc(p.x * blockSize, p.y * blockSize, p.size * (blockSize / 25), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // OVERLAY: PAUSED / GAME OVER / READY
    if (isPaused) {
      ctx.fillStyle = 'rgba(10, 10, 12, 0.85)';
      ctx.fillRect(0, 0, width, height);

      ctx.font = 'bold 20px "Inter", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Rainbow paused text
      ctx.shadowBlur = 10;
      ctx.shadowColor = `hsla(${hueShift}, 100%, 50%, 0.8)`;
      ctx.fillStyle = `hsla(${hueShift}, 100%, 70%, 1)`;
      ctx.fillText('PAUSED', width / 2, height / 2 - 10);

      ctx.shadowBlur = 0;
      ctx.font = '12px "JetBrains Mono", sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText('Press P or Play to Resume', width / 2, height / 2 + 20);
    } else if (isGameOver) {
      ctx.fillStyle = 'rgba(10, 10, 12, 0.9)';
      ctx.fillRect(0, 0, width, height);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = 'bold 24px "Inter", sans-serif';
      ctx.fillStyle = '#ff0055';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff0055';
      ctx.fillText('GAME OVER', width / 2, height / 2 - 20);

      ctx.shadowBlur = 0;
      ctx.font = '13px "JetBrains Mono", sans-serif';
      ctx.fillStyle = '#f3f4f6';
      ctx.fillText('Rainbow faded away!', width / 2, height / 2 + 15);

      ctx.font = '11px "Inter", sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText('Tap Restart / Key to play again', width / 2, height / 2 + 40);
    }

  }, [board, currentPiece, ghostPosition, particles, blockSize, rainbowFever, hueShift, isPaused, isGameOver, clearingLines]);

  // Style the board container with the Bold Typography theme's chunky borders and white shadows
  return (
    <div
      id="tetris-board-frame"
      className="relative flex items-center justify-center w-full h-full transition-all duration-500"
      style={{
        border: rainbowFever ? '5px solid' : '4px solid #ffffff',
        borderImage: rainbowFever 
          ? `linear-gradient(${hueShift}deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b00ff) 1` 
          : 'none',
        boxShadow: rainbowFever
          ? `0 0 40px hsla(${hueShift}, 100%, 50%, 0.6)`
          : '0 0 25px rgba(255,255,255,0.25)',
        backgroundColor: '#0a0a0a',
      }}
    >
      {/* Inner Screen */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden bg-[#0a0a0a] flex items-center justify-center"
      >
        <canvas ref={canvasRef} className="block transition-all" />
      </div>
    </div>
  );
}
