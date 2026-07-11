export type Point = {
  x: number;
  y: number;
};

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export interface Tetromino {
  type: TetrominoType;
  matrix: number[][];
  colorIndex: number; // 1 to 7 representing Rainbow spectrum colors
  position: Point;
}

export type BoardMatrix = number[][]; // 0 representing empty, 1-7 representing colors

export interface GameStats {
  score: number;
  lines: number;
  level: number;
  highScore: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export const COLS = 10;
export const ROWS = 20;

// Rainbow colors list for rendering
export const RAINBOW_COLORS = [
  '#000000', // 0: Empty
  '#ff0055', // 1: Vibrant Ruby Pink-Red
  '#ff7700', // 2: Electric Orange
  '#ffdd00', // 3: Neon Yellow
  '#00ff66', // 4: Acid Green
  '#00f0ff', // 5: Sky Cyan
  '#0044ff', // 6: Deep Blue
  '#9900ff', // 7: Royal Violet
];

// Gradients matching the rainbow spectrum
export const RAINBOW_GRADIENTS = [
  ['#1a1a1a', '#0f0f0f'], // 0: Grid Background
  ['#ff0055', '#ff5500'], // 1: Red
  ['#ff6a00', '#ffb300'], // 2: Orange
  ['#ffd200', '#9dff00'], // 3: Yellow
  ['#00ff66', '#00ffcc'], // 4: Green
  ['#00f0ff', '#0077ff'], // 5: Cyan/Blue
  ['#0044ff', '#7a00ff'], // 6: Blue/Violet
  ['#9900ff', '#ff00aa'], // 7: Violet/Pink
];

// Keyboard map
export const KEY_CODES = {
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  DOWN: 'ArrowDown',
  UP: 'ArrowUp',
  SPACE: 'Space',
  HOLD_C: 'KeyC',
  HOLD_SHIFT: 'ShiftLeft',
  ESCAPE: 'Escape',
  PAUSE: 'KeyP',
};

// Tetromino standard matrices
export const TETROMINOES: Record<TetrominoType, { matrix: number[][]; colorIndex: number }> = {
  I: {
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    colorIndex: 5, // Cyan
  },
  O: {
    matrix: [
      [1, 1],
      [1, 1],
    ],
    colorIndex: 3, // Yellow
  },
  T: {
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    colorIndex: 7, // Violet
  },
  S: {
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    colorIndex: 4, // Green
  },
  Z: {
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    colorIndex: 1, // Red
  },
  J: {
    matrix: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    colorIndex: 6, // Blue
  },
  L: {
    matrix: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    colorIndex: 2, // Orange
  },
};
