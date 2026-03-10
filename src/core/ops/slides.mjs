import { createId } from '../schema.mjs';

function clone(v) {
  return structuredClone(v);
}

function findSlideIndex(doc, slideId) {
  return doc.slides.findIndex(s => s.id === slideId);
}

/**
 * @param {any} doc
 * @param {{name?: string, masterId?: string, layoutId?: string, id?: string}} [opts]
 */
export function addSlide(doc, opts = {}) {
  const next = clone(doc);
  const id = opts.id ?? createId();

  const requestedMaster = typeof opts.masterId === 'string' && opts.masterId
    ? next.masters.find(m => m?.id === opts.masterId)
    : null;
  const master = requestedMaster ?? next.masters[0];

  const masterId = master?.id ?? 'master-default';

  const requestedLayout = typeof opts.layoutId === 'string' && opts.layoutId && Array.isArray(master?.layouts)
    ? master.layouts.find(l => l?.id === opts.layoutId)
    : null;
  const layout = requestedLayout ?? master?.layouts?.[0];

  const layoutId = layout?.id ?? 'layout-title';

  next.slides.push({
    id,
    name: opts.name ?? `Slide ${next.slides.length + 1}`,
    masterId,
    layoutId,
    elements: [],
  });

  return { doc: next, slideId: id };
}

export function deleteSlide(doc, slideId) {
  const next = clone(doc);
  const idx = findSlideIndex(next, slideId);
  if (idx < 0) return { doc: next, deleted: false };
  next.slides.splice(idx, 1);
  return { doc: next, deleted: true };
}

export function renameSlide(doc, slideId, name) {
  const next = clone(doc);
  const s = next.slides.find(s => s.id === slideId);
  if (!s) return { doc: next, updated: false };
  s.name = name;
  return { doc: next, updated: true };
}
