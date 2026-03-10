export function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function xmlDecl() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
}

export function hexToSrgbVal(hex) {
  const h = String(hex || '').trim();
  if (!h) return null;
  const m = /^#?([0-9a-fA-F]{6})$/.exec(h);
  return m ? m[1].toUpperCase() : null;
}

export function joinXml(parts) {
  return parts.filter(Boolean).join('');
}
