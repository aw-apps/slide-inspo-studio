import { ZipWriter } from './zipWriter.js';
import { buildPptxParts } from './ooxmlParts.js';
import { migrateDoc, assertValidDoc } from '../../core/index.mjs';

/**
 * @param {any} doc
 * @returns {ArrayBuffer}
 */
export function exportPptxArrayBuffer(doc) {
  const migrated = migrateDoc(doc);
  assertValidDoc(migrated);

  const parts = buildPptxParts(migrated);
  const zip = new ZipWriter();
  for (const p of parts) zip.addFile(p.path, p.data);
  return zip.finish();
}

/**
 * Trigger a download in the browser.
 * @param {any} doc
 */
export function exportPptxFile(doc) {
  const ab = exportPptxArrayBuffer(doc);
  const blob = new Blob([ab], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });

  const title = String(doc?.meta?.title || 'slide-doc').replace(/\s+/g, '-');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${title}.pptx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
