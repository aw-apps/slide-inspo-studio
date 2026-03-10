import { clamp, rectFromPoints, rectIntersects, rectUnion, centerOfRect, angleDegFromCenter, snapAngleDeg } from './geometry.js';
import { getCanvasPoint, applyElementStyle } from './dom.js';
import { computeSnapForMove } from './snapping.js';

const MIN_SIZE = 10;

function byId(slide, id) {
  return slide.elements.find(e => e.id === id);
}

function getRectsForIds(slide, ids) {
  return ids
    .map(id => byId(slide, id))
    .filter(Boolean)
    .map(e => ({ id: e.id, x: e.x, y: e.y, w: e.w, h: e.h }));
}

function setGuides(layer, guides, slideW, slideH) {
  layer.querySelectorAll('.snap-guide').forEach(n => n.remove());
  for (const x of guides.v || []) {
    const line = document.createElement('div');
    line.className = 'snap-guide snap-guide-v';
    line.style.left = `${x}px`;
    line.style.top = '0px';
    line.style.height = `${slideH}px`;
    layer.append(line);
  }
  for (const y of guides.h || []) {
    const line = document.createElement('div');
    line.className = 'snap-guide snap-guide-h';
    line.style.top = `${y}px`;
    line.style.left = '0px';
    line.style.width = `${slideW}px`;
    layer.append(line);
  }
}

function ensureOverlay(canvas) {
  let layer = canvas.querySelector(':scope > .selection-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'selection-layer';
    canvas.append(layer);
  }
  return layer;
}

function renderSelectionOverlay({ canvas, slide, selectedIds, onHandlePointerDown }) {
  const layer = ensureOverlay(canvas);
  layer.innerHTML = '';

  if (!selectedIds.length) return;

  const rects = getRectsForIds(slide, selectedIds);
  const bbox = rectUnion(rects);

  const box = document.createElement('div');
  box.className = `selection-box ${selectedIds.length > 1 ? 'group' : 'single'}`;
  box.style.left = `${bbox.x}px`;
  box.style.top = `${bbox.y}px`;
  box.style.width = `${bbox.w}px`;
  box.style.height = `${bbox.h}px`;

  if (selectedIds.length === 1) {
    const e = byId(slide, selectedIds[0]);
    const rot = Number.isFinite(e?.rotation) ? e.rotation : 0;
    box.style.transform = `rotate(${rot}deg)`;
    box.style.transformOrigin = '50% 50%';

    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    for (const h of handles) {
      const hn = document.createElement('div');
      hn.className = `handle handle-${h}`;
      hn.dataset.handle = h;
      hn.addEventListener('pointerdown', (ev) => onHandlePointerDown(ev, { type: 'resize', handle: h }));
      box.append(hn);
    }

    const rotHandle = document.createElement('div');
    rotHandle.className = 'rotate-handle';
    rotHandle.dataset.handle = 'rotate';
    rotHandle.addEventListener('pointerdown', (ev) => onHandlePointerDown(ev, { type: 'rotate' }));
    box.append(rotHandle);

    const rotLine = document.createElement('div');
    rotLine.className = 'rotate-line';
    box.append(rotLine);
  }

  layer.append(box);
}

export function attachCanvasInteractions({
  canvas,
  slide,
  selectedIds,
  setSelectedIds,
  commitPatches,
  slideW,
  slideH,
}) {
  const overlay = ensureOverlay(canvas);

  function refreshOverlay() {
    renderSelectionOverlay({
      canvas,
      slide,
      selectedIds: selectedIds(),
      onHandlePointerDown: handlePointerDown,
    });
  }

  function setSel(ids, opts) {
    setSelectedIds(ids, opts);
  }

  function isInteractiveTarget(t) {
    return !!t.closest?.('.handle, .rotate-handle');
  }

  function findElementIdFromEventTarget(t) {
    const el = t.closest?.('.el');
    return el?.dataset?.elementId || null;
  }

  let drag = null;
  let marquee = null;

  function beginDrag(ev, ids) {
    const start = getCanvasPoint(canvas, ev.clientX, ev.clientY);
    const all = slide.elements;
    const otherRects = all
      .filter(e => !ids.includes(e.id))
      .map(e => ({ x: e.x, y: e.y, w: e.w, h: e.h }));

    const startRects = getRectsForIds(slide, ids);
    drag = {
      type: 'move',
      pointerId: ev.pointerId,
      ids,
      start,
      startRects,
      otherRects,
    };

    canvas.setPointerCapture(ev.pointerId);
    setGuides(overlay, { v: [], h: [] }, slideW, slideH);
  }

  function updateMove(ev) {
    const pt = getCanvasPoint(canvas, ev.clientX, ev.clientY);
    const rawDx = pt.x - drag.start.x;
    const rawDy = pt.y - drag.start.y;

    const snap = computeSnapForMove({
      selectedRects: drag.startRects,
      otherRects: drag.otherRects,
      slideW,
      slideH,
      dx: rawDx,
      dy: rawDy,
    });

    setGuides(overlay, snap.guides, slideW, slideH);

    for (const r of drag.startRects) {
      const node = canvas.querySelector(`.el[data-element-id="${r.id}"]`);
      if (!node) continue;
      const next = { x: r.x + snap.dx, y: r.y + snap.dy, w: r.w, h: r.h, rotation: byId(slide, r.id)?.rotation ?? 0 };
      applyElementStyle(node, next);
    }

    const rects = drag.startRects.map(r => ({ ...r, x: r.x + snap.dx, y: r.y + snap.dy }));
    const bbox = rectUnion(rects);
    const box = canvas.querySelector('.selection-box');
    if (box) {
      box.style.left = `${bbox.x}px`;
      box.style.top = `${bbox.y}px`;
      box.style.width = `${bbox.w}px`;
      box.style.height = `${bbox.h}px`;
    }
  }

  function endMove(ev) {
    const pt = getCanvasPoint(canvas, ev.clientX, ev.clientY);
    const rawDx = pt.x - drag.start.x;
    const rawDy = pt.y - drag.start.y;

    const snap = computeSnapForMove({
      selectedRects: drag.startRects,
      otherRects: drag.otherRects,
      slideW,
      slideH,
      dx: rawDx,
      dy: rawDy,
    });

    const patchesById = {};
    for (const r of drag.startRects) {
      const nx = r.x + snap.dx;
      const ny = r.y + snap.dy;
      if (nx !== r.x || ny !== r.y) patchesById[r.id] = { x: nx, y: ny };
    }

    setGuides(overlay, { v: [], h: [] }, slideW, slideH);
    drag = null;

    // Re-render selection/layers even if no movement.
    commitPatches(patchesById, { rerenderOnly: Object.keys(patchesById).length === 0 });
  }

  function beginMarquee(ev) {
    const start = getCanvasPoint(canvas, ev.clientX, ev.clientY);
    marquee = { pointerId: ev.pointerId, start };
    canvas.setPointerCapture(ev.pointerId);

    const rect = document.createElement('div');
    rect.className = 'marquee';
    rect.style.left = `${start.x}px`;
    rect.style.top = `${start.y}px`;
    rect.style.width = '0px';
    rect.style.height = '0px';
    overlay.append(rect);
  }

  function updateMarquee(ev) {
    const pt = getCanvasPoint(canvas, ev.clientX, ev.clientY);
    const r = rectFromPoints(marquee.start, pt);
    const node = overlay.querySelector('.marquee');
    if (node) {
      node.style.left = `${r.x}px`;
      node.style.top = `${r.y}px`;
      node.style.width = `${r.w}px`;
      node.style.height = `${r.h}px`;
    }
  }

  function endMarquee(ev) {
    const pt = getCanvasPoint(canvas, ev.clientX, ev.clientY);
    const r = rectFromPoints(marquee.start, pt);
    overlay.querySelector('.marquee')?.remove();

    const hits = slide.elements
      .map(e => ({ id: e.id, x: e.x, y: e.y, w: e.w, h: e.h }))
      .filter(b => rectIntersects(r, b))
      .map(b => b.id);

    marquee = null;
    setSel(hits, { rerender: true });
    refreshOverlay();
  }

  function handlePointerDown(ev, meta) {
    ev.preventDefault();
    ev.stopPropagation();
    if (meta.type === 'resize') beginResize(ev, meta.handle);
    if (meta.type === 'rotate') beginRotate(ev);
  }

  function beginResize(ev, handle) {
    const ids = selectedIds();
    if (ids.length !== 1) return;

    const id = ids[0];
    const e = byId(slide, id);
    if (!e) return;

    const start = getCanvasPoint(canvas, ev.clientX, ev.clientY);

    drag = {
      type: 'resize',
      pointerId: ev.pointerId,
      id,
      handle,
      start,
      startBox: { x: e.x, y: e.y, w: e.w, h: e.h, rotation: e.rotation ?? 0 },
    };

    canvas.setPointerCapture(ev.pointerId);
  }

  function updateResize(ev) {
    const pt = getCanvasPoint(canvas, ev.clientX, ev.clientY);
    const dx = pt.x - drag.start.x;
    const dy = pt.y - drag.start.y;

    const b = { ...drag.startBox };

    let x = b.x;
    let y = b.y;
    let w = b.w;
    let h = b.h;

    const hdl = drag.handle;

    if (hdl.includes('e')) w = b.w + dx;
    if (hdl.includes('s')) h = b.h + dy;
    if (hdl.includes('w')) {
      x = b.x + dx;
      w = b.w - dx;
    }
    if (hdl.includes('n')) {
      y = b.y + dy;
      h = b.h - dy;
    }

    w = Math.max(MIN_SIZE, w);
    h = Math.max(MIN_SIZE, h);

    if (hdl.includes('w')) x = b.x + (b.w - w);
    if (hdl.includes('n')) y = b.y + (b.h - h);

    x = clamp(x, -slideW, slideW * 2);
    y = clamp(y, -slideH, slideH * 2);

    const node = canvas.querySelector(`.el[data-element-id="${drag.id}"]`);
    if (node) applyElementStyle(node, { x, y, w, h, rotation: b.rotation ?? 0 });

    const box = canvas.querySelector('.selection-box');
    if (box) {
      box.style.left = `${x}px`;
      box.style.top = `${y}px`;
      box.style.width = `${w}px`;
      box.style.height = `${h}px`;
    }
  }

  function endResize() {
    const node = canvas.querySelector(`.el[data-element-id="${drag.id}"]`);
    const box = canvas.querySelector('.selection-box');
    if (!node || !box) {
      drag = null;
      return;
    }

    const x = Number.parseFloat(node.style.left || '0');
    const y = Number.parseFloat(node.style.top || '0');
    const w = Number.parseFloat(node.style.width || '0');
    const h = Number.parseFloat(node.style.height || '0');

    drag = null;
    commitPatches({ [selectedIds()[0]]: { x, y, w, h } }, { rerenderOnly: false });
  }

  function beginRotate(ev) {
    const ids = selectedIds();
    if (ids.length !== 1) return;

    const id = ids[0];
    const e = byId(slide, id);
    if (!e) return;

    const start = getCanvasPoint(canvas, ev.clientX, ev.clientY);
    const box = { x: e.x, y: e.y, w: e.w, h: e.h };
    const center = centerOfRect(box);

    drag = {
      type: 'rotate',
      pointerId: ev.pointerId,
      id,
      center,
      startRotation: e.rotation ?? 0,
      startAngle: angleDegFromCenter(center, start),
    };

    canvas.setPointerCapture(ev.pointerId);
  }

  function updateRotate(ev) {
    const pt = getCanvasPoint(canvas, ev.clientX, ev.clientY);
    const angle = angleDegFromCenter(drag.center, pt);
    const delta = angle - drag.startAngle;
    let rot = drag.startRotation + delta;

    if (ev.shiftKey) rot = snapAngleDeg(rot, 15, 6);

    const node = canvas.querySelector(`.el[data-element-id="${drag.id}"]`);
    if (node) {
      node.style.transform = `rotate(${rot}deg)`;
      node.style.transformOrigin = '50% 50%';
    }

    const box = canvas.querySelector('.selection-box');
    if (box) {
      box.style.transform = `rotate(${rot}deg)`;
      box.style.transformOrigin = '50% 50%';
    }
  }

  function endRotate() {
    const node = canvas.querySelector(`.el[data-element-id="${drag.id}"]`);
    if (!node) {
      drag = null;
      return;
    }
    const m = /rotate\(([-0-9.]+)deg\)/.exec(node.style.transform || '');
    const rot = m ? Number(m[1]) : 0;
    const id = drag.id;
    drag = null;
    commitPatches({ [id]: { rotation: rot } }, { rerenderOnly: false });
  }

  function onPointerDown(ev) {
    if (isInteractiveTarget(ev.target)) return;

    const id = findElementIdFromEventTarget(ev.target);
    const multi = ev.shiftKey || ev.metaKey || ev.ctrlKey;

    if (id) {
      const cur = selectedIds();
      let next = cur;
      if (multi) {
        next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
      } else {
        next = cur.length === 1 && cur[0] === id ? cur : [id];
      }

      // Avoid rerender during pointer interaction.
      setSel(next, { rerender: false });
      refreshOverlay();

      if (ev.target.isContentEditable) return;
      beginDrag(ev, next);
      return;
    }

    if (!multi) setSel([], { rerender: false });
    refreshOverlay();
    beginMarquee(ev);
  }

  function onPointerMove(ev) {
    if (drag?.pointerId === ev.pointerId) {
      if (drag.type === 'move') updateMove(ev);
      if (drag.type === 'resize') updateResize(ev);
      if (drag.type === 'rotate') updateRotate(ev);
      return;
    }
    if (marquee?.pointerId === ev.pointerId) updateMarquee(ev);
  }

  function onPointerUp(ev) {
    if (drag?.pointerId === ev.pointerId) {
      if (drag.type === 'move') return endMove(ev);
      if (drag.type === 'resize') return endResize(ev);
      if (drag.type === 'rotate') return endRotate(ev);
    }
    if (marquee?.pointerId === ev.pointerId) return endMarquee(ev);
  }

  canvas.onpointerdown = onPointerDown;
  canvas.onpointermove = onPointerMove;
  canvas.onpointerup = onPointerUp;

  refreshOverlay();

  return {
    refreshOverlay,
    clearGuides: () => setGuides(overlay, { v: [], h: [] }, slideW, slideH),
  };
}
