import { SIZE, type Board as BoardState } from '../lib/puzzle';

interface BoardProps {
  board: BoardState;
  goal: BoardState;
  /** When set, tiles next to the blank are clickable. */
  onTileClick?: (index: number) => void;
  canMove?: (index: number) => boolean;
  small?: boolean;
  label: string;
}

/**
 * Tiles are positioned with CSS transforms keyed by tile number,
 * so React keeps the same element and the browser animates the slide.
 */
export function Board({ board, goal, onTileClick, canMove, small = false, label }: BoardProps) {
  const tiles = Array.from({ length: SIZE * SIZE - 1 }, (_, i) => i + 1);

  return (
    <div
      className={`board${small ? ' board--small' : ''}`}
      role="grid"
      aria-label={label}
    >
      {tiles.map((tile) => {
        const index = board.indexOf(tile);
        const row = Math.floor(index / SIZE);
        const col = index % SIZE;
        const placed = goal[index] === tile;
        const movable = onTileClick !== undefined && canMove?.(index) === true;
        return (
          <button
            key={tile}
            type="button"
            role="gridcell"
            className={`tile${placed ? ' tile--placed' : ''}${movable ? ' tile--movable' : ''}`}
            style={{ transform: `translate(${col * 100}%, ${row * 100}%)` }}
            disabled={!movable}
            aria-label={`Tile ${tile}, row ${row + 1} column ${col + 1}`}
            onClick={() => onTileClick?.(index)}
          >
            {tile}
          </button>
        );
      })}
    </div>
  );
}
