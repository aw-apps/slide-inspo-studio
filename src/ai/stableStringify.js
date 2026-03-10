function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function canonicalize(v) {
  if (Array.isArray(v)) return v.map(canonicalize);
  if (!isPlainObject(v)) return v;

  const out = {};
  for (const k of Object.keys(v).sort()) out[k] = canonicalize(v[k]);
  return out;
}

/**
 * Deterministic JSON stringify: sorts object keys recursively.
 * Arrays preserve order.
 * @param {any} value
 * @param {number} [space]
 */
export function stableStringify(value, space = 2) {
  return `${JSON.stringify(canonicalize(value), null, space)}\n`;
}
