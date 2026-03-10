import { attachCanvasInteractions } from '../editor/interactions.js';

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'style') n.setAttribute('style', v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v);
  }
  for (const c of children) n.append(c);
  return n;
}

export function renderSlidesList({ doc, selectedSlideId, onSelect }) {
  const root = document.getElementById('slides');
  root.innerHTML = '';
  for (const s of doc.slides) {
    const item = el('div', { class: `thumb ${s.id === selectedSlideId ? 'active' : ''}` }, [
      el('div', {}, [s.name]),
      el('div', { class: 'muted' }, [`${s.elements.length} elements`]),
    ]);
    item.addEventListener('click', () => onSelect(s.id));
    root.append(item);
  }
}

function getPageSize(doc) {
  const w = Number(doc?.meta?.page?.w);
  const h = Number(doc?.meta?.page?.h);
  return {
    w: Number.isFinite(w) && w > 0 ? w : 960,
    h: Number.isFinite(h) && h > 0 ? h : 540,
  };
}

export function renderStage({
  doc,
  selectedSlideId,
  getSelectedElementIds,
  setSelectedElementIds,
  commitElementPatches,
  onTextEdit,
}) {
  const stage = document.getElementById('stage');
  stage.innerHTML = '';
  const slide = doc.slides.find(s => s.id === selectedSlideId);

  const page = getPageSize(doc);

  const canvasWrap = el('div', { class: 'slide-canvas-wrap' });
  const canvas = el('div', { class: 'slide-canvas', tabindex: '0' });

  // Logical canvas size (used by editor interactions).
  canvas.style.width = `${page.w}px`;
  canvas.style.height = `${page.h}px`;

  // Slide background (best-effort from PPTX).
  canvas.style.background = slide?.bg?.color || '#fff';

  // Fit-to-view scaling.
  // Note: interactions account for transform scaling via getCanvasPoint().
  const availW = Math.max(1, stage.clientWidth);
  const availH = Math.max(1, stage.clientHeight);
  const scale = Math.min(1, availW / page.w, availH / page.h);

  canvas.style.transform = `scale(${scale})`;
  canvas.style.transformOrigin = 'top left';

  canvasWrap.style.width = `${page.w * scale}px`;
  canvasWrap.style.height = `${page.h * scale}px`;

  if (slide) {
    const selected = new Set(getSelectedElementIds());

    for (const e of slide.elements) {
      const node = renderElement(e, selected.has(e.id));

      if (e.type === 'text') {
        node.addEventListener('dblclick', (ev) => {
          ev.stopPropagation();
          node.contentEditable = 'true';
          node.focus();
        });
        node.addEventListener('blur', () => {
          if (node.contentEditable !== 'true') return;
          node.contentEditable = 'false';
          const nextText = node.textContent ?? '';
          if (typeof onTextEdit === 'function' && nextText !== e.text) onTextEdit(e.id, nextText);
        });
      }

      canvas.append(node);
    }

    attachCanvasInteractions({
      canvas,
      slide,
      selectedIds: getSelectedElementIds,
      setSelectedIds: setSelectedElementIds,
      commitPatches: commitElementPatches,
      slideW: page.w,
      slideH: page.h,
    });
  }

  canvasWrap.append(canvas);
  stage.append(canvasWrap);
}

function renderElement(e, selected) {
  const rot = Number.isFinite(e.rotation) ? e.rotation : 0;

  const base = {
    class: `el ${selected ? 'selected' : ''}`,
    'data-element-id': e.id,
    style: `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;transform:rotate(${rot}deg);transform-origin:50% 50%;`,
  };

  if (e.type === 'rect') {
    const r = Number.isFinite(e.radius) ? e.radius : 0;
    return el('div', { ...base, style: base.style + `background:${e.fill};border-radius:${r}px;cursor:move;` });
  }
  if (e.type === 'text') {
    const align = e.align || 'left';
    return el('div', {
      ...base,
      style: base.style + `font-size:${e.fontSize}px;color:${e.color};padding:6px;cursor:text;white-space:pre-wrap;user-select:text;text-align:${align};`,
    }, [e.text]);
  }
  return el('div', base);
}

export function renderLayers({ doc, selectedSlideId, selectedElementIds, onSelectElement, onReorder }) {
  const root = document.getElementById('layers');
  root.innerHTML = '';
  const slide = doc.slides.find(s => s.id === selectedSlideId);
  if (!slide) return;

  const selected = new Set(selectedElementIds);

  // Display top-most first.
  for (const e of [...slide.elements].reverse()) {
    const up = el('button', { class: 'layer-btn', title: 'Bring forward' }, ['^']);
    const down = el('button', { class: 'layer-btn', title: 'Send backward' }, ['v']);

    up.addEventListener('click', (ev) => { ev.stopPropagation(); onReorder?.(e.id, 'forward'); });
    down.addEventListener('click', (ev) => { ev.stopPropagation(); onReorder?.(e.id, 'backward'); });

    const row = el('div', { class: `thumb ${selected.has(e.id) ? 'active' : ''}` }, [
      el('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px;' }, [
        el('div', {}, [`${e.type} - ${e.id.slice(0, 6)}`]),
        el('div', { style: 'display:flex;gap:6px;' }, [up, down]),
      ]),
    ]);

    row.addEventListener('click', (ev) => onSelectElement(e.id, { toggle: ev.shiftKey || ev.metaKey || ev.ctrlKey }));
    root.append(row);
  }
}

export function renderInspector({ doc, selectedSlideId, selectedElementIds, onPatchElement }) {
  const root = document.getElementById('inspector');
  root.innerHTML = '';

  const slide = doc.slides.find(s => s.id === selectedSlideId);
  const ids = selectedElementIds || [];

  if (!slide || ids.length !== 1) {
    const msg = ids.length
      ? `${ids.length} selected (group move supported)`
      : 'Select one element to edit properties';
    root.append(el('div', { class: 'muted' }, [msg]));
    return;
  }

  const element = slide.elements.find(e => e.id === ids[0]);
  if (!element) {
    root.append(el('div', { class: 'muted' }, ['Select one element to edit properties']));
    return;
  }

  root.append(field('x', element.x, (v) => onPatchElement?.({ x: v })));
  root.append(field('y', element.y, (v) => onPatchElement?.({ y: v })));
  root.append(field('w', element.w, (v) => onPatchElement?.({ w: v })));
  root.append(field('h', element.h, (v) => onPatchElement?.({ h: v })));
  root.append(field('rotation', element.rotation ?? 0, (v) => onPatchElement?.({ rotation: v })));

  if (element.type === 'rect') {
    root.append(colorField('fill', element.fill, (v) => onPatchElement?.({ fill: v })));
    root.append(field('radius', element.radius ?? 0, (v) => onPatchElement?.({ radius: v })));
  }
  if (element.type === 'text') {
    root.append(textField('text', element.text, (v) => onPatchElement?.({ text: v })));
    root.append(field('fontSize', element.fontSize, (v) => onPatchElement?.({ fontSize: v })));
    root.append(colorField('color', element.color, (v) => onPatchElement?.({ color: v })));
  }
}

function field(label, value, onChange) {
  const wrap = document.createElement('div');
  wrap.style.marginBottom = '10px';
  const l = document.createElement('div');
  l.textContent = label;
  l.className = 'muted';
  const input = document.createElement('input');
  input.type = 'number';
  input.value = String(value ?? 0);
  input.style.width = '100%';
  input.addEventListener('input', () => onChange(Number(input.value)));
  wrap.append(l, input);
  return wrap;
}

function textField(label, value, onChange) {
  const wrap = document.createElement('div');
  wrap.style.marginBottom = '10px';
  const l = document.createElement('div');
  l.textContent = label;
  l.className = 'muted';
  const input = document.createElement('textarea');
  input.value = String(value ?? '');
  input.rows = 4;
  input.style.width = '100%';
  input.addEventListener('input', () => onChange(input.value));
  wrap.append(l, input);
  return wrap;
}

function colorField(label, value, onChange) {
  const wrap = document.createElement('div');
  wrap.style.marginBottom = '10px';
  const l = document.createElement('div');
  l.textContent = label;
  l.className = 'muted';
  const input = document.createElement('input');
  input.type = 'color';
  input.value = typeof value === 'string' && value.startsWith('#') ? value : '#000000';
  input.addEventListener('input', () => onChange(input.value));
  wrap.append(l, input);
  return wrap;
}
