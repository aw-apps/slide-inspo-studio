import { createId } from '../schema.mjs';

function clone(v) {
  return structuredClone(v);
}

function getSlide(next, slideId) {
  return next.slides.find(s => s.id === slideId);
}

export function addTextElement(doc, slideId, opts = {}) {
  const next = clone(doc);
  const slide = getSlide(next, slideId);
  if (!slide) return { doc: next, elementId: null };

  const el = {
    id: opts.id ?? createId(),
    type: 'text',
    x: opts.x ?? 80,
    y: opts.y ?? 80,
    w: opts.w ?? 320,
    h: opts.h ?? 60,
    text: opts.text ?? 'Double-click to edit',
    fontSize: opts.fontSize ?? 28,
    color: opts.color ?? '#111111',
  };

  slide.elements.push(el);
  return { doc: next, elementId: el.id };
}

export function addRectElement(doc, slideId, opts = {}) {
  const next = clone(doc);
  const slide = getSlide(next, slideId);
  if (!slide) return { doc: next, elementId: null };

  const el = {
    id: opts.id ?? createId(),
    type: 'rect',
    x: opts.x ?? 120,
    y: opts.y ?? 140,
    w: opts.w ?? 300,
    h: opts.h ?? 180,
    fill: opts.fill ?? '#e9ecff',
    radius: opts.radius ?? 10,
  };

  slide.elements.push(el);
  return { doc: next, elementId: el.id };
}

export function updateElement(doc, slideId, elementId, patch) {
  const next = clone(doc);
  const slide = getSlide(next, slideId);
  const el = slide?.elements.find(e => e.id === elementId);
  if (!el) return { doc: next, updated: false };
  Object.assign(el, patch);
  return { doc: next, updated: true };
}

export function patchElements(doc, slideId, patchesById) {
  const next = clone(doc);
  const slide = getSlide(next, slideId);
  if (!slide) return { doc: next, updated: false, updatedIds: [] };

  const updatedIds = [];
  for (const [id, patch] of Object.entries(patchesById || {})) {
    const el = slide.elements.find(e => e.id === id);
    if (!el) continue;
    Object.assign(el, patch);
    updatedIds.push(id);
  }

  return { doc: next, updated: updatedIds.length > 0, updatedIds };
}

export function moveElement(doc, slideId, elementId, dx, dy) {
  const slide = doc.slides.find(s => s.id === slideId);
  const el = slide?.elements.find(e => e.id === elementId);
  if (!el) return updateElement(doc, slideId, elementId, {});

  return updateElement(doc, slideId, elementId, {
    x: el.x + (Number.isFinite(dx) ? dx : 0),
    y: el.y + (Number.isFinite(dy) ? dy : 0),
  });
}

export function resizeElement(doc, slideId, elementId, dw, dh) {
  const slide = doc.slides.find(s => s.id === slideId);
  const el = slide?.elements.find(e => e.id === elementId);
  if (!el) return updateElement(doc, slideId, elementId, {});

  return updateElement(doc, slideId, elementId, {
    w: el.w + (Number.isFinite(dw) ? dw : 0),
    h: el.h + (Number.isFinite(dh) ? dh : 0),
  });
}

export function deleteElement(doc, slideId, elementId) {
  const next = clone(doc);
  const slide = getSlide(next, slideId);
  if (!slide) return { doc: next, deleted: false };
  const idx = slide.elements.findIndex(e => e.id === elementId);
  if (idx < 0) return { doc: next, deleted: false };
  slide.elements.splice(idx, 1);
  return { doc: next, deleted: true };
}
