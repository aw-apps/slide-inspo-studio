import { SCHEMA_VERSION } from './schema.mjs';

function isObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function clone(v) {
  return structuredClone(v);
}

function defaultMaster() {
  return {
    id: 'master-default',
    name: 'Default Master',
    layouts: [
      { id: 'layout-title', name: 'Title', placeholders: [] },
      { id: 'layout-title-content', name: 'Title + Content', placeholders: [] },
    ],
    theme: {
      fonts: { body: 'Inter, system-ui', heading: 'Inter, system-ui' },
      colors: { text: '#111111', bg: '#ffffff', accent: '#2b4cff' },
    },
  };
}

function normalizeV1(doc) {
  const next = clone(doc);

  if (!isObject(next.meta)) next.meta = { title: 'Untitled', createdAt: Date.now(), updatedAt: Date.now() };
  if (typeof next.meta.title !== 'string') next.meta.title = 'Untitled';
  if (typeof next.meta.createdAt !== 'number') next.meta.createdAt = Date.now();
  if (typeof next.meta.updatedAt !== 'number') next.meta.updatedAt = Date.now();

  if (!Array.isArray(next.masters)) next.masters = [];
  if (!Array.isArray(next.slides)) next.slides = [];
  if (!Array.isArray(next.assets)) next.assets = [];

  if (next.masters.length === 0) next.masters.push(defaultMaster());

  // ensure required fields exist on masters/layouts
  for (const m of next.masters) {
    if (!isObject(m)) continue;
    if (typeof m.id !== 'string' || !m.id) m.id = 'master-default';
    if (typeof m.name !== 'string') m.name = 'Master';
    if (!Array.isArray(m.layouts) || m.layouts.length === 0) m.layouts = defaultMaster().layouts;
    if (!isObject(m.theme)) m.theme = defaultMaster().theme;
  }

  const defaultMasterId = next.masters[0]?.id ?? 'master-default';
  const defaultLayoutId = next.masters[0]?.layouts?.[0]?.id ?? 'layout-title';

  // ensure slides have required fields
  for (const s of next.slides) {
    if (!isObject(s)) continue;
    if (typeof s.id !== 'string' || !s.id) s.id = `slide-${Math.random().toString(16).slice(2)}`;
    if (typeof s.name !== 'string') s.name = 'Slide';
    if (typeof s.masterId !== 'string' || !s.masterId) s.masterId = defaultMasterId;
    if (typeof s.layoutId !== 'string' || !s.layoutId) s.layoutId = defaultLayoutId;
    if (!Array.isArray(s.elements)) s.elements = [];
  }

  next.schemaVersion = 1;
  return next;
}

/**
 * Forward-only migration to latest schema version.
 * @param {any} input
 */
export function migrateDoc(input) {
  if (!isObject(input)) throw new Error('Document must be an object');
  const current = typeof input.schemaVersion === 'number' ? input.schemaVersion : 1;

  if (current > SCHEMA_VERSION) {
    throw new Error(`Document schemaVersion ${current} is newer than supported (${SCHEMA_VERSION})`);
  }

  let doc = clone(input);

  // v1: baseline normalization (also covers missing schemaVersion).
  if (current <= 1) {
    doc = normalizeV1(doc);
  }

  // Future migrations would go here:
  // if (doc.schemaVersion === 1) doc = migrateV1ToV2(doc);

  if (doc.schemaVersion !== SCHEMA_VERSION) {
    doc.schemaVersion = SCHEMA_VERSION;
  }

  return doc;
}
