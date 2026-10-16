export interface FillState {
  fills: Record<string, string>;
  /** What each region was before the change, for undo */
  history: { id: string; prev: string | undefined }[];
}

export const emptyFill = (): FillState => ({ fills: {}, history: [] });

export function fillRegion(s: FillState, id: string, color: string): FillState {
  if (s.fills[id] === color) return s;
  return { fills: { ...s.fills, [id]: color }, history: [...s.history, { id, prev: s.fills[id] }].slice(-100) };
}

export function undoFill(s: FillState): FillState {
  const last = s.history[s.history.length - 1];
  if (!last) return s;
  const fills = { ...s.fills };
  if (last.prev === undefined) delete fills[last.id];
  else fills[last.id] = last.prev;
  return { fills, history: s.history.slice(0, -1) };
}
