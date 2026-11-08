/** A board is 9 numbers read row by row; 0 is the blank tile. */
export type Board = readonly number[];

/** Direction the blank tile moves. */
export type Move = 'U' | 'L' | 'R' | 'D';

export const SIZE = 3;

export const CLASSIC_GOAL: Board = [1, 2, 3, 4, 5, 6, 7, 8, 0];

/** Instance used in the university lab: optimal solution is 21 moves. */
export const LAB_START: Board = [3, 0, 8, 7, 1, 5, 6, 2, 4];
export const LAB_GOAL: Board = [5, 6, 0, 3, 4, 7, 2, 1, 8];

export const MOVE_NAMES: Record<Move, string> = {
  U: 'Up',
  L: 'Left',
  R: 'Right',
  D: 'Down',
};

export function key(board: Board): string {
  return board.join('');
}

export function boardsEqual(a: Board, b: Board): boolean {
  return a.every((v, i) => v === b[i]);
}

function swap(board: Board, i: number, j: number): Board {
  const next = board.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/**
 * All boards reachable in one move, in the order Up, Left, Right, Down.
 * (Same order as the Python reference solver, so tie-breaking matches.)
 */
export function neighbors(board: Board): { board: Board; move: Move }[] {
  const blank = board.indexOf(0);
  const row = Math.floor(blank / SIZE);
  const col = blank % SIZE;
  const out: { board: Board; move: Move }[] = [];
  if (row > 0) out.push({ board: swap(board, blank, blank - SIZE), move: 'U' });
  if (col > 0) out.push({ board: swap(board, blank, blank - 1), move: 'L' });
  if (col < SIZE - 1) out.push({ board: swap(board, blank, blank + 1), move: 'R' });
  if (row < SIZE - 1) out.push({ board: swap(board, blank, blank + SIZE), move: 'D' });
  return out;
}

/** Index of the tile that would slide into the blank if the user clicks `index`, or null. */
export function isAdjacentToBlank(board: Board, index: number): boolean {
  const blank = board.indexOf(0);
  const dr = Math.abs(Math.floor(blank / SIZE) - Math.floor(index / SIZE));
  const dc = Math.abs((blank % SIZE) - (index % SIZE));
  return dr + dc === 1;
}

export function slideTile(board: Board, index: number): Board {
  return swap(board, board.indexOf(0), index);
}

/** h1: number of misplaced tiles (blank excluded). */
export function misplaced(board: Board, goal: Board): number {
  let count = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== 0 && board[i] !== goal[i]) count++;
  }
  return count;
}

/** h2: sum of Manhattan distances of every tile (blank excluded). */
export function manhattan(board: Board, goal: Board): number {
  let total = 0;
  for (let tile = 1; tile < SIZE * SIZE; tile++) {
    const a = board.indexOf(tile);
    const b = goal.indexOf(tile);
    total +=
      Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE)) + Math.abs((a % SIZE) - (b % SIZE));
  }
  return total;
}

function inversions(board: Board): number {
  const tiles = board.filter((t) => t !== 0);
  let count = 0;
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      if (tiles[i] > tiles[j]) count++;
    }
  }
  return count;
}

/**
 * On an odd-width board, `start` can reach `goal` exactly when both have
 * the same inversion parity.
 */
export function isSolvable(start: Board, goal: Board): boolean {
  return inversions(start) % 2 === inversions(goal) % 2;
}

/** Random solvable board: a random walk of `steps` moves away from `goal` (never undoing a move). */
export function shuffleFrom(goal: Board, steps = 60, random: () => number = Math.random): Board {
  let board = goal;
  let previous = '';
  for (let i = 0; i < steps; i++) {
    const options = neighbors(board).filter((n) => key(n.board) !== previous);
    const pick = options[Math.floor(random() * options.length)];
    previous = key(board);
    board = pick.board;
  }
  return board;
}

/** Parse "3 0 8 7 1 5 6 2 4" or "308715624" into a valid board, or null. */
export function parseBoard(text: string): Board | null {
  const digits = text.replace(/[^0-8]/g, '').split('').map(Number);
  if (digits.length !== SIZE * SIZE) return null;
  if (new Set(digits).size !== digits.length) return null;
  return digits;
}
