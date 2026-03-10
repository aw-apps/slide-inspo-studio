import { importPptxArrayBuffer } from './pptxImport.js';
import { migrateDoc, assertValidDoc } from '../../core/index.mjs';

export async function importPptxFile(file) {
  const ab = await file.arrayBuffer();
  const title = (file?.name || 'Imported PPTX').replace(/\.pptx$/i, '');
  const doc = await importPptxArrayBuffer(ab, { title });

  const migrated = migrateDoc(doc);
  assertValidDoc(migrated);
  return migrated;
}
