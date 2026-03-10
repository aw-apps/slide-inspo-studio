function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
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

export function renderStage({ doc, selectedSlideId, selectedElementId, onSelectElement }) {
  const stage = document.getElementById('stage');
  stage.innerHTML = '';
  const slide = doc.slides.find(s => s.id === selectedSlideId);
  const canvas = el('div', { class: 'slide-canvas' });
  if (slide) {
    for (const e of slide.elements) {
      const node = renderElement(e, e.id === selectedElementId);
      node.addEventListener('mousedown', (ev) => { ev.stopPropagation(); onSelectElement(e.id); });
      if (e.type === 'text') {
        node.addEventListener('dblclick', () => {
          node.contentEditable = 'true';
          node.focus();
        });
        node.addEventListener('blur', () => { node.contentEditable = 'false'; });
      }
      canvas.append(node);
    }
  }
  canvas.addEventListener('mousedown', () => onSelectElement(null));
  stage.append(canvas);
}

function renderElement(e, selected) {
  const base = {
    class: `el ${selected ? 'selected' : ''}`,
    style: `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;`,
  };
  if (e.type === 'rect') {
    return el('div', { ...base, style: base.style + `background:${e.fill};border-radius:10px;` });
  }
  if (e.type === 'text') {
    return el('div', {
      ...base,
      style: base.style + `font-size:${e.fontSize}px;color:${e.color};padding:6px;cursor:text;`,
    }, [e.text]);
  }
  return el('div', base);
}

export function renderLayers({ doc, selectedSlideId, selectedElementId, onSelectElement }) {
  const root = document.getElementById('layers');
  root.innerHTML = '';
  const slide = doc.slides.find(s => s.id === selectedSlideId);
  if (!slide) return;
  for (const e of [...slide.elements].reverse()) {
    const row = el('div', { class: `thumb ${e.id === selectedElementId ? 'active' : ''}` }, [
      el('div', {}, [`${e.type} • ${e.id.slice(0, 6)}`]),
    ]);
    row.addEventListener('click', () => onSelectElement(e.id));
    root.append(row);
  }
}

export function renderInspector({ doc, selectedSlideId, selectedElementId, onUpdateDoc }) {
  const root = document.getElementById('inspector');
  root.innerHTML = '';
  const slide = doc.slides.find(s => s.id === selectedSlideId);
  const element = slide?.elements.find(e => e.id === selectedElementId);
  if (!element) {
    root.append(el('div', { class: 'muted' }, ['選取一個元素以編輯屬性']));
    return;
  }

  root.append(field('x', element.x, (v) => patch({ x: v })));
  root.append(field('y', element.y, (v) => patch({ y: v })));
  root.append(field('w', element.w, (v) => patch({ w: v })));
  root.append(field('h', element.h, (v) => patch({ h: v })));

  if (element.type === 'rect') {
    root.append(colorField('fill', element.fill, (v) => patch({ fill: v })));
  }
  if (element.type === 'text') {
    root.append(textField('text', element.text, (v) => patch({ text: v })));
    root.append(field('fontSize', element.fontSize, (v) => patch({ fontSize: v })));
    root.append(colorField('color', element.color, (v) => patch({ color: v })));
  }

  function patch(delta) {
    const next = structuredClone(doc);
    const s = next.slides.find(s => s.id === selectedSlideId);
    const e = s?.elements.find(e => e.id === selectedElementId);
    if (!e) return;
    Object.assign(e, delta);
    onUpdateDoc(next);
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
  input.value = value || '#000000';
  input.addEventListener('input', () => onChange(input.value));
  wrap.append(l, input);
  return wrap;
}
