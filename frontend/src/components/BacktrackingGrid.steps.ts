// BacktrackingGrid.steps.ts — pure N-Queens backtracking step generation (no React).
// Finds the first solution, snapshotting the board (one column per row), the cell
// being tried, and any attacking queens, at every try / place / backtrack.

export type QueensStepKind = "try" | "conflict" | "place" | "backtrack" | "solved" | "settle";

export type QueensStep = {
  n: number;
  board: number[]; // board[row] = col, or -1
  active: { r: number; c: number } | null;
  conflicts: number[]; // attacking queen cell ids (r*n + c)
  kind: QueensStepKind;
  caption: string;
};

export function generateQueensSteps(n: number): QueensStep[] {
  const board = new Array(n).fill(-1);
  const steps: QueensStep[] = [];
  const snap = (
    active: { r: number; c: number } | null,
    conflicts: number[],
    kind: QueensStepKind,
    caption: string,
  ) => steps.push({ n, board: [...board], active, conflicts, kind, caption });

  const attackers = (row: number, col: number): number[] => {
    const out: number[] = [];
    for (let r = 0; r < row; r++) {
      const c = board[r];
      if (c === col || Math.abs(c - col) === Math.abs(r - row)) out.push(r * n + c);
    }
    return out;
  };

  const place = (row: number): boolean => {
    if (row === n) {
      snap(null, [], "solved", `solved — ${n} queens placed`);
      return true;
    }
    for (let col = 0; col < n; col++) {
      snap({ r: row, c: col }, [], "try", `try queen at row ${row}, col ${col}`);
      const atk = attackers(row, col);
      if (atk.length === 0) {
        board[row] = col;
        snap({ r: row, c: col }, [], "place", `place queen at (${row}, ${col})`);
        if (place(row + 1)) return true;
        board[row] = -1;
        snap({ r: row, c: col }, [], "backtrack", `dead end — backtrack from (${row}, ${col})`);
      } else {
        snap({ r: row, c: col }, atk, "conflict", `(${row}, ${col}) is attacked`);
      }
    }
    return false;
  };

  place(0);
  snap(null, [], "settle", "done");
  return steps;
}
