import { describe, expect, it } from 'vitest';
import { MinHeap } from './heap';
import {
  CLASSIC_GOAL,
  LAB_GOAL,
  LAB_START,
  isSolvable,
  manhattan,
  misplaced,
  neighbors,
  parseBoard,
  shuffleFrom,
} from './puzzle';
import { solve } from './solver';

describe('board rules', () => {
  it('generates the right number of moves for centre, edge and corner blanks', () => {
    expect(neighbors([1, 2, 3, 4, 0, 5, 6, 7, 8])).toHaveLength(4);
    expect(neighbors([1, 0, 2, 3, 4, 5, 6, 7, 8])).toHaveLength(3);
    expect(neighbors([0, 1, 2, 3, 4, 5, 6, 7, 8])).toHaveLength(2);
  });

  it('moves the blank in the expected direction', () => {
    const moves = neighbors([1, 2, 3, 4, 0, 5, 6, 7, 8]);
    expect(moves.find((m) => m.move === 'U')?.board).toEqual([1, 0, 3, 4, 2, 5, 6, 7, 8]);
    expect(moves.find((m) => m.move === 'R')?.board).toEqual([1, 2, 3, 4, 5, 0, 6, 7, 8]);
  });

  it('computes both heuristics', () => {
    const a = [1, 2, 3, 4, 0, 5, 6, 7, 8];
    const b = [1, 2, 3, 4, 5, 8, 6, 0, 7];
    expect(misplaced(a, b)).toBe(3);
    expect(manhattan(a, b)).toBe(3);
  });

  it('detects unsolvable boards', () => {
    expect(isSolvable([1, 2, 3, 4, 5, 6, 8, 7, 0], CLASSIC_GOAL)).toBe(false);
    expect(isSolvable(LAB_START, LAB_GOAL)).toBe(true);
  });

  it('shuffles into solvable boards', () => {
    for (let i = 0; i < 20; i++) {
      expect(isSolvable(shuffleFrom(CLASSIC_GOAL, 40), CLASSIC_GOAL)).toBe(true);
    }
  });

  it('parses user input', () => {
    expect(parseBoard('3 0 8 7 1 5 6 2 4')).toEqual(LAB_START);
    expect(parseBoard('308715624')).toEqual(LAB_START);
    expect(parseBoard('111111111')).toBeNull();
    expect(parseBoard('1 2 3')).toBeNull();
  });
});

describe('heap', () => {
  it('pops in priority order and keeps FIFO order for ties', () => {
    const heap = new MinHeap<string>();
    heap.push('c', 2);
    heap.push('a', 1);
    heap.push('b1', 2);
    heap.push('b2', 2);
    expect([heap.pop(), heap.pop(), heap.pop(), heap.pop()]).toEqual(['a', 'c', 'b1', 'b2']);
    expect(heap.pop()).toBeUndefined();
  });
});

// These numbers are identical to the Python reference solver for the same instance.
describe('solver on the lab instance', () => {
  it('A* with Manhattan finds the optimal 21-move path expanding 336 nodes', () => {
    const r = solve(LAB_START, LAB_GOAL, 'astar-h2');
    expect(r.found).toBe(true);
    expect(r.moves.join('')).toBe('RDLLDRRULURDLLURDDRUU');
    expect(r.expanded).toBe(336);
  });

  it('A* with misplaced tiles is optimal but expands more', () => {
    const r = solve(LAB_START, LAB_GOAL, 'astar-h1');
    expect(r.moves).toHaveLength(21);
    expect(r.expanded).toBe(5275);
  });

  it('greedy is faster but not optimal', () => {
    const r = solve(LAB_START, LAB_GOAL, 'greedy-h2');
    expect(r.moves).toHaveLength(45);
    expect(r.expanded).toBe(134);
  });

  it('breadth-first is optimal', () => {
    const r = solve(LAB_START, LAB_GOAL, 'bfs');
    expect(r.moves).toHaveLength(21);
    expect(r.expanded).toBe(67183);
  });

  it('every returned path is a legal sequence of boards', () => {
    const r = solve(LAB_START, LAB_GOAL, 'astar-h2');
    expect(r.path[0]).toEqual(LAB_START);
    expect(r.path.at(-1)).toEqual(LAB_GOAL);
    for (let i = 1; i < r.path.length; i++) {
      const legal = neighbors(r.path[i - 1]).some((n) => n.board.join() === r.path[i].join());
      expect(legal).toBe(true);
    }
  });

  it('reports unsolvable instances instead of searching', () => {
    const r = solve([1, 2, 3, 4, 5, 6, 8, 7, 0], CLASSIC_GOAL, 'astar-h2');
    expect(r.found).toBe(false);
    expect(r.reason).toBe('unsolvable');
  });
});
