function b64ToU8(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Parse a data: URL into bytes.
 * Supports base64 encoding.
 * @param {string} url
 */
export function parseDataUrl(url) {
  const s = String(url || '');
  if (!s.startsWith('data:')) return null;

  const comma = s.indexOf(',');
  if (comma < 0) return null;

  const meta = s.slice(5, comma); // after data:
  const data = s.slice(comma + 1);

  const isB64 = /;base64$/i.test(meta) || /;base64;/i.test(meta);
  const mime = meta.split(';')[0] || 'application/octet-stream';

  if (!isB64) {
    // Percent-decoded utf-8 bytes (best-effort).
    const text = decodeURIComponent(data);
    return { mime, bytes: new TextEncoder().encode(text) };
  }

  return { mime, bytes: b64ToU8(data) };
}
