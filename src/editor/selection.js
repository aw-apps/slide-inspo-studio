export function normalizeSelection(ids) {
  const out = [];
  const seen = new Set();
  for (const id of ids || []) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function isSelected(selection, id) {
  return selection.includes(id);
}

export function toggleSelected(selection, id) {
  if (!id) return selection;
  if (selection.includes(id)) return selection.filter(x => x !== id);
  return [...selection, id];
}

export function setSingle(selection, id) {
  if (!id) return [];
  if (selection.length === 1 && selection[0] === id) return selection;
  return [id];
}
