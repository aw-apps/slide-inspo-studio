function toHex(u8) {
  return Array.from(u8, b => b.toString(16).padStart(2, '0')).join('');
}

/** @param {Uint8Array} u8 */
export async function sha256Hex(u8) {
  const buf = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return toHex(new Uint8Array(digest));
}
