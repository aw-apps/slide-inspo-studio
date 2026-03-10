import { parseDataUrl } from './dataUrl.js';
import { sha256Hex } from './sha256.js';
import { extFromMime } from './mime.js';

async function bytesFromSrc(src) {
  const s = String(src || '');
  const parsed = parseDataUrl(s);
  if (parsed) return { mime: parsed.mime, bytes: parsed.bytes };

  const res = await fetch(s);
  const ab = await res.arrayBuffer();
  const mime = res.headers.get('content-type') || 'application/octet-stream';
  return { mime, bytes: new Uint8Array(ab) };
}

/**
 * Build a deterministic asset catalog.
 *
 * - IDs are sha256-based: `sha256:<hex>`
 * - Files are stored at `assets/<sha256><ext>`
 * - Output is sorted by ID for stability
 *
 * @param {any[]} assets
 */
export async function buildAssetCatalog(assets) {
  /** @type {Map<string, any>} */
  const bySha = new Map();
  /** @type {Record<string, string>} */
  const idMap = {};

  for (const a of assets || []) {
    const originalId = String(a?.id || '');
    if (!originalId) continue;

    const { mime: srcMime, bytes } = await bytesFromSrc(a?.src);
    const mime = String(a?.mime || srcMime || 'application/octet-stream');

    const sha256 = await sha256Hex(bytes);
    const id = `sha256:${sha256}`;

    idMap[originalId] = id;

    if (!bySha.has(sha256)) {
      const ext = extFromMime(mime);
      bySha.set(sha256, {
        id,
        sha256,
        type: String(a?.type || 'image'),
        mime,
        bytes,
        sizeBytes: bytes.length,
        filePath: `assets/${sha256}${ext}`,
        name: a?.name ? String(a.name) : undefined,
      });
    }
  }

  const list = Array.from(bySha.values()).sort((x, y) => String(x.id).localeCompare(String(y.id)));
  return { assets: list, idMap };
}
