import { useCallback, useEffect, useMemo, useState } from 'react';
import { Board } from './components/Board';
import {
  CLASSIC_GOAL,
  LAB_GOAL,
  LAB_START,
  MOVE_NAMES,
  boardsEqual,
  isAdjacentToBlank,
  isSolvable,
  parseBoard,
  shuffleFrom,
  slideTile,
  type Board as BoardState,
} from './lib/puzzle';
import { ALGORITHMS, solve, type Algorithm, type SolveResult } from './lib/solver';

type GoalId = 'lab' | 'classic';
const GOALS: Record<GoalId, { label: string; board: BoardState }> = {
  lab: { label: 'Lab goal (5 6 _ / 3 4 7 / 2 1 8)', board: LAB_GOAL },
  classic: { label: 'Classic goal (1 2 3 / 4 5 6 / 7 8 _)', board: CLASSIC_GOAL },
};

const fmt = new Intl.NumberFormat('en-US');

function formatMs(ms: number): string {
  return ms < 1 ? '<1 ms' : ms < 1000 ? `${ms.toFixed(0)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

export default function App() {
  const [goalId, setGoalId] = useState<GoalId>('lab');
  const [manual, setManual] = useState<BoardState>(LAB_START);
  const [algorithm, setAlgorithm] = useState<Algorithm>('astar-h2');
  const [result, setResult] = useState<SolveResult | null>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [compare, setCompare] = useState<SolveResult[] | null>(null);
  const [startText, setStartText] = useState(LAB_START.join(' '));

  const goal = GOALS[goalId].board;
  const board = result?.found ? result.path[step] : manual;
  const solved = boardsEqual(board, goal);
  const startIsGoal = boardsEqual(manual, goal);
  const info = ALGORITHMS.find((a) => a.id === algorithm)!;

  /** Any manual change invalidates the previous solution. */
  const changeBoard = useCallback((next: BoardState) => {
    setManual(next);
    setStartText(next.join(' '));
    setResult(null);
    setCompare(null);
    setStep(0);
    setPlaying(false);
  }, []);

  const changeGoal = (id: GoalId) => {
    setGoalId(id);
    changeBoard(id === 'lab' ? LAB_START : shuffleFrom(CLASSIC_GOAL, 40));
  };

  // Auto-play the solution one move at a time.
  const atEnd = result?.found === true && step >= result.path.length - 1;
  const isPlaying = playing && !atEnd;
  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setTimeout(() => setStep((s) => s + 1), 380);
    return () => window.clearTimeout(id);
  }, [isPlaying, step]);

  const runSolve = () => {
    setBusy(true);
    setCompare(null);
    // Let React paint the "Solving…" state before the synchronous search starts.
    window.setTimeout(() => {
      const r = solve(manual, goal, algorithm);
      setResult(r);
      setStep(0);
      setPlaying(r.found && r.path.length > 1);
      setBusy(false);
    }, 30);
  };

  const runCompare = () => {
    setBusy(true);
    window.setTimeout(() => {
      setCompare(ALGORITHMS.map((a) => solve(manual, goal, a.id)));
      setBusy(false);
    }, 30);
  };

  const submitStart = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseBoard(startText);
    if (parsed) changeBoard(parsed);
  };

  const parsed = useMemo(() => parseBoard(startText), [startText]);
  const solvable = isSolvable(manual, goal);
  const maxExpanded = compare ? Math.max(...compare.map((r) => r.expanded), 1) : 1;
  const bestOptimal = compare
    ? Math.min(
        ...compare
          .filter((r) => r.found && ALGORITHMS.find((a) => a.id === r.algorithm)!.optimal)
          .map((r) => r.expanded),
      )
    : 0;

  return (
    <main className="app">
      <header className="hero">
        <h1>Puzzle Lab</h1>
        <p>
          Watch BFS, uniform-cost, greedy and A* solve the 8-puzzle, and compare how much work each
          one does.
        </p>
      </header>

      <div className="layout">
        <section className="panel stage" aria-label="Puzzle">
          <Board
            board={board}
            goal={goal}
            label="Current puzzle"
            onTileClick={result?.found ? undefined : (i) => changeBoard(slideTile(manual, i))}
            canMove={(i) => isAdjacentToBlank(manual, i)}
          />

          <p className="status" aria-live="polite">
            {result?.found
              ? `Step ${step} of ${result.moves.length}${
                  step > 0 ? ` · blank moved ${MOVE_NAMES[result.moves[step - 1]]}` : ''
                }`
              : solved
                ? 'Solved!'
                : !solvable
                  ? 'This board cannot reach the goal (wrong parity)'
                  : 'Click a tile next to the blank to move it'}
          </p>

          {result?.found && (
            <div className="player">
              <button type="button" onClick={() => { setPlaying(false); setStep(0); }} disabled={step === 0} aria-label="Back to start">⏮</button>
              <button type="button" onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }} disabled={step === 0} aria-label="Previous move">◀</button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  if (atEnd) {
                    setStep(0);
                    setPlaying(true);
                  } else {
                    setPlaying(!isPlaying);
                  }
                }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button type="button" onClick={() => { setPlaying(false); setStep((s) => Math.min(result.path.length - 1, s + 1)); }} disabled={step >= result.path.length - 1} aria-label="Next move">▶</button>
              <input
                type="range"
                min={0}
                max={result.path.length - 1}
                value={step}
                onChange={(e) => { setPlaying(false); setStep(Number(e.target.value)); }}
                aria-label="Solution step"
              />
            </div>
          )}

          <div className="goal">
            <span>Goal</span>
            <Board board={goal} goal={goal} small label="Goal puzzle" />
          </div>
        </section>

        <section className="panel controls" aria-label="Controls">
          <h2>Setup</h2>
          <label>
            Goal
            <select value={goalId} onChange={(e) => changeGoal(e.target.value as GoalId)}>
              {(Object.keys(GOALS) as GoalId[]).map((id) => (
                <option key={id} value={id}>{GOALS[id].label}</option>
              ))}
            </select>
          </label>

          <form className="start-form" onSubmit={submitStart}>
            <label>
              Start board (9 digits, 0 = blank)
              <input
                value={startText}
                onChange={(e) => setStartText(e.target.value)}
                aria-invalid={parsed === null}
                inputMode="numeric"
              />
            </label>
            <button type="submit" disabled={parsed === null}>Set</button>
          </form>

          <div className="row">
            <button type="button" onClick={() => changeBoard(shuffleFrom(goal, 60))}>🔀 Shuffle</button>
            <button type="button" onClick={() => changeBoard(goalId === 'lab' ? LAB_START : CLASSIC_GOAL)}>
              {goalId === 'lab' ? '↺ Lab instance' : '↺ Solved'}
            </button>
          </div>

          <h2>Algorithm</h2>
          <label>
            Search method
            <select value={algorithm} onChange={(e) => { setAlgorithm(e.target.value as Algorithm); setResult(null); setStep(0); setPlaying(false); }}>
              {ALGORITHMS.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </label>
          <p className="blurb">{info.blurb}</p>

          <div className="row">
            <button type="button" className="primary" onClick={runSolve} disabled={busy || !solvable || startIsGoal}>
              {busy ? 'Solving…' : 'Solve'}
            </button>
            <button type="button" onClick={runCompare} disabled={busy || !solvable || startIsGoal}>
              Compare all
            </button>
          </div>

          {result && (
            <dl className="stats" aria-label="Result">
              {result.found ? (
                <>
                  <div><dt>Moves</dt><dd>{result.moves.length}{info.optimal ? ' (optimal)' : ''}</dd></div>
                  <div><dt>Nodes expanded</dt><dd>{fmt.format(result.expanded)}</dd></div>
                  <div><dt>Max frontier</dt><dd>{fmt.format(result.maxFrontier)}</dd></div>
                  <div><dt>Time</dt><dd>{formatMs(result.ms)}</dd></div>
                </>
              ) : (
                <div><dt>No solution</dt><dd>{result.reason === 'limit' ? 'Search limit reached' : 'Unsolvable'}</dd></div>
              )}
            </dl>
          )}
        </section>
      </div>

      {compare && (
        <section className="panel compare" aria-label="Algorithm comparison">
          <h2>Comparison on this board</h2>
          <table>
            <thead>
              <tr><th>Method</th><th>Moves</th><th>Nodes expanded</th><th>Time</th></tr>
            </thead>
            <tbody>
              {compare.map((r) => {
                const meta = ALGORITHMS.find((a) => a.id === r.algorithm)!;
                const best = r.found && meta.optimal && r.expanded === bestOptimal;
                return (
                  <tr key={r.algorithm} className={best ? 'best' : undefined}>
                    <td>{meta.label}{best && <span className="badge">fewest (optimal)</span>}</td>
                    <td>{r.found ? r.moves.length : '–'}{r.found && !meta.optimal && <span className="muted"> not optimal</span>}</td>
                    <td>
                      <div className="bar-cell">
                        <div className="bar-track">
                          <div className="bar" style={{ width: `${Math.max(2, (r.expanded / maxExpanded) * 100)}%` }} />
                        </div>
                        <span>{fmt.format(r.expanded)}</span>
                      </div>
                    </td>
                    <td>{formatMs(r.ms)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <footer>
        Solver written in TypeScript; results are checked against a Python reference implementation in the unit tests.
      </footer>
    </main>
  );
}
