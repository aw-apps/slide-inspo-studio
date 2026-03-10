function clone(v) {
  return structuredClone(v);
}

function getSlide(next, slideId) {
  return next.slides.find(s => s.id === slideId);
}

function moveItem(arr, from, to) {
  const copy = arr.slice();
  const [it] = copy.splice(from, 1);
  copy.splice(to, 0, it);
  return copy;
}

/**
 * Reorder element z-order within a slide.
 * Elements later in the array are drawn on top.
 *
 * @param {any} doc
 * @param {string} slideId
 * @param {string} elementId
 * @param {'forward'|'backward'|'front'|'back'} action
 */
export function reorderLayer(doc, slideId, elementId, action) {
  const next = clone(doc);
  const slide = getSlide(next, slideId);
  if (!slide) return { doc: next, reordered: false };

  const idx = slide.elements.findIndex(e => e.id === elementId);
  if (idx < 0) return { doc: next, reordered: false };

  let target = idx;
  if (action === 'forward') target = Math.min(slide.elements.length - 1, idx + 1);
  else if (action === 'backward') target = Math.max(0, idx - 1);
  else if (action === 'front') target = slide.elements.length - 1;
  else if (action === 'back') target = 0;

  if (target === idx) return { doc: next, reordered: false };

  slide.elements = moveItem(slide.elements, idx, target);
  return { doc: next, reordered: true };
}
