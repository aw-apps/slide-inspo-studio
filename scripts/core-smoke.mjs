import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createEmptyDoc,
  migrateDoc,
  assertValidDoc,
  addSlide,
  addTextElement,
  addRectElement,
  reorderLayer,
} from '../src/core/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function stable(v) {
  return JSON.stringify(v);
}

async function main() {
  // Fixture load + validate
  const fixturePath = path.join(__dirname, '..', 'src', 'core', 'fixtures', 'sampleDoc.v1.json');
  const raw = await fs.readFile(fixturePath, 'utf8');
  const fixture = migrateDoc(JSON.parse(raw));
  assertValidDoc(fixture);

  // Create → add slide → add text → reorder → export/import → same structure
  let doc = createEmptyDoc();
  assertValidDoc(doc);

  const s1 = doc.slides[0].id;
  let r;

  r = addRectElement(doc, s1, { id: 'rect-a', x: 10, y: 10, w: 10, h: 10 });
  doc = r.doc;
  r = addRectElement(doc, s1, { id: 'rect-b', x: 20, y: 20, w: 10, h: 10 });
  doc = r.doc;

  // rect-b is on top (later in array). Send it backward.
  doc = reorderLayer(doc, s1, 'rect-b', 'backward').doc;
  const ids = doc.slides[0].elements.map(e => e.id);
  if (ids[0] !== 'rect-b') throw new Error(`Expected rect-b moved backward. Got order: ${ids.join(',')}`);

  const addedSlide = addSlide(doc, { id: 'slide-new', name: 'New Slide' });
  doc = addedSlide.doc;
  const newSlideId = addedSlide.slideId;

  doc = addTextElement(doc, newSlideId, { id: 'text-1', text: 'Hello', x: 50, y: 60, w: 200, h: 60 }).doc;
  assertValidDoc(doc);

  const exported = stable(doc);
  const reloaded = migrateDoc(JSON.parse(exported));
  assertValidDoc(reloaded);

  if (stable(reloaded) !== exported) {
    throw new Error('Reloaded document differs after migrate/validate roundtrip');
  }

  console.log('core-smoke: OK');
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
