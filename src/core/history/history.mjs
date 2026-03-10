/**
 * Simple snapshot-based undo/redo history.
 *
 * Stores structured clones of documents.
 */

function clone(v) {
  return structuredClone(v);
}

export function createHistory(opts = {}) {
  return {
    limit: Number.isFinite(opts.limit) ? opts.limit : 200,
    past: [],
    future: [],
  };
}

export function pushHistory(history, docSnapshot) {
  const next = {
    ...history,
    past: [...history.past, clone(docSnapshot)],
    future: [],
  };
  if (next.past.length > next.limit) next.past = next.past.slice(next.past.length - next.limit);
  return next;
}

export function canUndo(history) {
  return history.past.length > 0;
}

export function canRedo(history) {
  return history.future.length > 0;
}

export function undo(history, currentDoc) {
  if (!canUndo(history)) return { history, doc: currentDoc, ok: false };
  const past = history.past.slice();
  const prev = past.pop();
  const future = [clone(currentDoc), ...history.future];
  return { history: { ...history, past, future }, doc: clone(prev), ok: true };
}

export function redo(history, currentDoc) {
  if (!canRedo(history)) return { history, doc: currentDoc, ok: false };
  const [nextDoc, ...rest] = history.future;
  const past = [...history.past, clone(currentDoc)];
  const future = rest;
  return { history: { ...history, past, future }, doc: clone(nextDoc), ok: true };
}
