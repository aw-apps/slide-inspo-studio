import { migrateDoc, assertValidDoc } from '../core/index.mjs';
import { buildAssetCatalog } from '../core/assets/catalog.js';
import { AI_EXPORT_VERSION } from './schema.js';
import { assertValidAIExport } from './validate.js';

function pageSize(doc) {
  const w = Number(doc?.meta?.page?.w);
  const h = Number(doc?.meta?.page?.h);
  return {
    w: Number.isFinite(w) && w > 0 ? w : 960,
    h: Number.isFinite(h) && h > 0 ? h : 540,
  };
}

function placeholderPolicyForType(type) {
  if (type === 'text') return { replaceable: true, kind: 'text', maxLen: 400, multiline: true };
  if (type === 'image') return { replaceable: true, kind: 'image' };
  return { replaceable: false, kind: type };
}

function collectStyleTokens(doc) {
  const colors = new Set();
  const fonts = new Set();
  const fontSizes = new Set();

  for (const m of doc.masters || []) {
    const c = m?.theme?.colors;
    if (c?.text) colors.add(String(c.text));
    if (c?.bg) colors.add(String(c.bg));
    if (c?.accent) colors.add(String(c.accent));

    const f = m?.theme?.fonts;
    if (f?.body) fonts.add(String(f.body));
    if (f?.heading) fonts.add(String(f.heading));
  }

  for (const s of doc.slides || []) {
    if (s?.bg?.color) colors.add(String(s.bg.color));

    for (const e of s.elements || []) {
      if (e?.type === 'text') {
        if (e.color) colors.add(String(e.color));
        if (e.fontFamily) fonts.add(String(e.fontFamily));
        if (Number.isFinite(e.fontSize)) fontSizes.add(Number(e.fontSize));
      }
      if (e?.type === 'rect') {
        if (e.fill) colors.add(String(e.fill));
        if (e.stroke) colors.add(String(e.stroke));
      }
    }
  }

  return {
    colors: Array.from(colors).sort((a, b) => a.localeCompare(b)),
    fonts: Array.from(fonts).sort((a, b) => a.localeCompare(b)),
    fontSizes: Array.from(fontSizes).sort((a, b) => a - b),
  };
}

function exportTemplates(doc) {
  const masters = (doc.masters || []).map((m) => ({
    id: String(m.id),
    name: String(m.name || ''),
    theme: m.theme ? structuredClone(m.theme) : null,
    layouts: (m.layouts || []).map((l) => ({
      id: String(l.id),
      name: String(l.name || ''),
      placeholders: (l.placeholders || []).map((p) => ({
        id: String(p.id),
        type: String(p.type),
        name: p.name ? String(p.name) : undefined,
        policy: placeholderPolicyForType(p.type),
      })),
    })),
  }));

  // Deterministic ordering (masters/layouts/placeholders do not impact rendering).
  masters.sort((a, b) => a.id.localeCompare(b.id));
  for (const m of masters) {
    m.layouts.sort((a, b) => a.id.localeCompare(b.id));
    for (const l of m.layouts) l.placeholders.sort((a, b) => a.id.localeCompare(b.id));
  }

  return { masters };
}

function exportSlides(doc, assetIdMap) {
  return (doc.slides || []).map((s) => ({
    id: String(s.id),
    name: String(s.name || ''),
    masterId: String(s.masterId),
    layoutId: String(s.layoutId),
    ...(s.bg ? { bg: structuredClone(s.bg) } : {}),
    elements: (s.elements || []).map((e) => {
      if (e?.type === 'image') {
        const next = structuredClone(e);
        const mapped = assetIdMap?.[String(e.assetId || '')];
        if (mapped) next.assetId = mapped;
        return next;
      }
      return structuredClone(e);
    }),
  }));
}

/**
 * Build the AI export object.
 * @param {any} doc
 */
export async function buildAIExport(doc) {
  const migrated = migrateDoc(doc);
  assertValidDoc(migrated);

  const { assets: catalog, idMap } = await buildAssetCatalog(migrated.assets);

  const exp = {
    version: AI_EXPORT_VERSION,
    doc: {
      title: String(migrated?.meta?.title || 'Untitled'),
      page: pageSize(migrated),
    },
    templates: exportTemplates(migrated),
    styleTokens: collectStyleTokens(migrated),
    assets: catalog.map((a) => ({
      id: a.id,
      sha256: a.sha256,
      type: a.type,
      mime: a.mime,
      sizeBytes: a.sizeBytes,
      filePath: a.filePath,
      ...(a.name ? { name: a.name } : {}),
    })),
    slides: exportSlides(migrated, idMap),
  };

  assertValidAIExport(exp);
  return exp;
}
