import { ZipWriter } from '../pptx/export/zipWriter.js';
import { migrateDoc, assertValidDoc } from '../core/index.mjs';
import { buildAssetCatalog } from '../core/assets/catalog.js';
import { buildAIExport } from './export.js';
import { stableStringify } from './stableStringify.js';

/**
 * @param {any} doc
 */
export async function exportAIArchiveArrayBuffer(doc) {
  const migrated = migrateDoc(doc);
  assertValidDoc(migrated);

  // Build export object (includes asset metadata) and a catalog (includes bytes).
  const exp = await buildAIExport(migrated);
  const { assets: catalog } = await buildAssetCatalog(migrated.assets);

  const json = stableStringify(exp, 2);
  const zip = new ZipWriter();
  zip.addFile('ai-export.v1.json', new TextEncoder().encode(json));

  for (const a of catalog) {
    zip.addFile(a.filePath, a.bytes);
  }

  return zip.finish();
}

/**
 * Trigger a download in the browser.
 * @param {any} doc
 */
export async function exportForAIFile(doc) {
  const ab = await exportAIArchiveArrayBuffer(doc);
  const blob = new Blob([ab], { type: 'application/zip' });

  const title = String(doc?.meta?.title || 'slide-doc').replace(/\s+/g, '-');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${title}-for-ai.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
