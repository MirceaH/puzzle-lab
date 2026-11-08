import { MinHeap } from './heap';
import {
  boardsEqual,
  isSolvable,
  key,
  manhattan,
  misplaced,
  neighbors,
  type Board,
  type Move,
} from './puzzle';

export type Algorithm = 'bfs' | 'ucs' | 'greedy-h1' | 'greedy-h2' | 'astar-h1' | 'astar-h2';

export interface AlgorithmInfo {
  id: Algorithm;
  label: string;
  /** Guaranteed to return a shortest solution (with uniform move cost). */
  optimal: boolean;
  blurb: string;
}

export const ALGORITHMS: AlgorithmInfo[] = [
  { id: 'astar-h2', label: 'A* · Manhattan', optimal: true, blurb: 'Orders by g + h2. Optimal and usually the fewest expansions.' },
  { id: 'astar-h1', label: 'A* · Misplaced tiles', optimal: true, blurb: 'Orders by g + h1. Optimal, but h1 is a weaker estimate than h2.' },
  { id: 'greedy-h2', label: 'Greedy · Manhattan', optimal: false, blurb: 'Orders by h2 only. Very fast, but the path is not the shortest.' },
  { id: 'greedy-h1', label: 'Greedy · Misplaced tiles', optimal: false, blurb: 'Orders by h1 only. Fast and usually a long path.' },
  { id: 'bfs', label: 'Breadth-first', optimal: true, blurb: 'Explores level by level. Optimal, but expands a huge number of nodes.' },
  { id: 'ucs', label: 'Uniform cost', optimal: true, blurb: 'Orders by g. With equal move costs it behaves like breadth-first.' },
];

export interface SolveResult {
  algorithm: Algorithm;
  found: boolean;
  /** Why the search stopped without a solution. */
  reason?: 'unsolvable' | 'limit';
  /** Every board from the start to the goal (start included). */
  path: Board[];
  moves: Move[];
  expanded: number;
  maxFrontier: number;
  ms: number;
}

interface Node {
  board: Board;
  parent: number;
  move: Move | null;
  g: number;
  h: number;
}

function heuristicFor(algorithm: Algorithm): (b: Board, goal: Board) => number {
  if (algorithm.endsWith('h1')) return misplaced;
  if (algorithm.endsWith('h2')) return manhattan;
  return () => 0;
}

function priorityFor(algorithm: Algorithm, node: Node): number {
  if (algorithm.startsWith('astar')) return node.g + node.h;
  if (algorithm.startsWith('greedy')) return node.h;
  if (algorithm === 'ucs') return node.g;
  return 0;
}

/**
 * Graph search with an explored set. A node counts as "expanded" when its
 * successors are generated. Move cost is 1.
 */
export function solve(
  start: Board,
  goal: Board,
  algorithm: Algorithm,
  maxExpansions = 300_000,
): SolveResult {
  const t0 = performance.now();
  const empty = (reason: SolveResult['reason'], expanded = 0, maxFrontier = 0): SolveResult => ({
    algorithm,
    found: false,
    reason,
    path: [],
    moves: [],
    expanded,
    maxFrontier,
    ms: performance.now() - t0,
  });

  if (!isSolvable(start, goal)) return empty('unsolvable');

  const h = heuristicFor(algorithm);
  const nodes: Node[] = [{ board: start, parent: -1, move: null, g: 0, h: h(start, goal) }];

  // BFS uses a plain FIFO queue; everything else a priority queue.
  const useQueue = algorithm === 'bfs';
  const queue: number[] = [0];
  let head = 0;
  const heap = new MinHeap<number>();
  heap.push(0, priorityFor(algorithm, nodes[0]));

  const explored = new Set<string>();
  let expanded = 0;
  let maxFrontier = 1;
  const frontierSize = () => (useQueue ? queue.length - head : heap.size);

  while (frontierSize() > 0) {
    const index = useQueue ? queue[head++] : heap.pop()!;
    const node = nodes[index];

    if (boardsEqual(node.board, goal)) {
      const path: Board[] = [];
      const moves: Move[] = [];
      for (let i = index; i !== -1; i = nodes[i].parent) {
        path.push(nodes[i].board);
        if (nodes[i].move) moves.push(nodes[i].move!);
      }
      path.reverse();
      moves.reverse();
      return { algorithm, found: true, path, moves, expanded, maxFrontier, ms: performance.now() - t0 };
    }

    const k = key(node.board);
    if (explored.has(k)) continue;
    explored.add(k);

    expanded++;
    for (const next of neighbors(node.board)) {
      if (explored.has(key(next.board))) continue;
      const child: Node = {
        board: next.board,
        parent: index,
        move: next.move,
        g: node.g + 1,
        h: h(next.board, goal),
      };
      nodes.push(child);
      const childIndex = nodes.length - 1;
      if (useQueue) queue.push(childIndex);
      else heap.push(childIndex, priorityFor(algorithm, child));
    }
    maxFrontier = Math.max(maxFrontier, frontierSize());

    if (expanded > maxExpansions) return empty('limit', expanded, maxFrontier);
  }

  return empty(undefined, expanded, maxFrontier);
}
