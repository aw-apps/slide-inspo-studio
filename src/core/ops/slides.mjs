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

  const masterId = opts.masterId ?? next.masters[0]?.id ?? 'master-default';
  const master = next.masters.find(m => m?.id === masterId) ?? next.masters[0];
  const layoutId = opts.layoutId ?? master?.layouts?.[0]?.id ?? 'layout-title';

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
