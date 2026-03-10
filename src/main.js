import { createEmptyDoc } from './model/doc.js';
import { renderSlidesList, renderStage, renderLayers, renderInspector } from './ui/render.js';
import { saveDocLocal, loadDocLocal, exportDocJson, importDocJson } from './persistence/local.js';

let state = {
  doc: loadDocLocal() ?? createEmptyDoc(),
  selectedSlideId: null,
  selectedElementId: null,
};

function ensureSelection() {
  if (!state.selectedSlideId) state.selectedSlideId = state.doc.slides[0]?.id ?? null;
}

function rerender() {
  ensureSelection();
  renderSlidesList({
    doc: state.doc,
    selectedSlideId: state.selectedSlideId,
    onSelect: (id) => { state.selectedSlideId = id; state.selectedElementId = null; rerender(); },
  });
  renderStage({
    doc: state.doc,
    selectedSlideId: state.selectedSlideId,
    selectedElementId: state.selectedElementId,
    onSelectElement: (id) => { state.selectedElementId = id; rerender(); },
  });
  renderLayers({
    doc: state.doc,
    selectedSlideId: state.selectedSlideId,
    selectedElementId: state.selectedElementId,
    onSelectElement: (id) => { state.selectedElementId = id; rerender(); },
  });
  renderInspector({
    doc: state.doc,
    selectedSlideId: state.selectedSlideId,
    selectedElementId: state.selectedElementId,
    onUpdateDoc: (nextDoc) => { state.doc = nextDoc; saveDocLocal(state.doc); rerender(); },
  });
}

function setTab(tab) {
  document.getElementById('tab-inspo').classList.toggle('active', tab === 'inspo');
  document.getElementById('tab-editor').classList.toggle('active', tab === 'editor');
  document.getElementById('view-inspo').classList.toggle('hidden', tab !== 'inspo');
  document.getElementById('view-editor').classList.toggle('hidden', tab !== 'editor');
}

document.getElementById('tab-inspo').addEventListener('click', () => setTab('inspo'));
document.getElementById('tab-editor').addEventListener('click', () => setTab('editor'));

document.getElementById('btn-new').addEventListener('click', () => {
  state.doc = createEmptyDoc();
  state.selectedSlideId = null;
  state.selectedElementId = null;
  saveDocLocal(state.doc);
  rerender();
  setTab('editor');
});

document.getElementById('btn-save').addEventListener('click', () => {
  saveDocLocal(state.doc);
  alert('已儲存到本機（localStorage）');
});


document.getElementById('btn-export').addEventListener('click', () => exportDocJson(state.doc));
document.getElementById('file-import').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const doc = await importDocJson(file);
  state.doc = doc;
  state.selectedSlideId = null;
  state.selectedElementId = null;
  saveDocLocal(state.doc);
  rerender();
  setTab('editor');
  e.target.value = '';
});

document.getElementById('btn-add-slide').addEventListener('click', () => {
  const next = structuredClone(state.doc);
  next.slides.push({ id: crypto.randomUUID(), name: `Slide ${next.slides.length + 1}`, elements: [] });
  state.doc = next;
  state.selectedSlideId = next.slides.at(-1).id;
  state.selectedElementId = null;
  saveDocLocal(state.doc);
  rerender();
});

document.getElementById('btn-add-text').addEventListener('click', () => {
  const next = structuredClone(state.doc);
  const slide = next.slides.find(s => s.id === state.selectedSlideId);
  if (!slide) return;
  const el = { id: crypto.randomUUID(), type: 'text', x: 80, y: 80, w: 320, h: 60, text: '雙擊編輯文字', fontSize: 28, color: '#111' };
  slide.elements.push(el);
  state.doc = next;
  state.selectedElementId = el.id;
  saveDocLocal(state.doc);
  rerender();
});

document.getElementById('btn-add-rect').addEventListener('click', () => {
  const next = structuredClone(state.doc);
  const slide = next.slides.find(s => s.id === state.selectedSlideId);
  if (!slide) return;
  const el = { id: crypto.randomUUID(), type: 'rect', x: 120, y: 140, w: 300, h: 180, fill: '#e9ecff' };
  slide.elements.push(el);
  state.doc = next;
  state.selectedElementId = el.id;
  saveDocLocal(state.doc);
  rerender();
});

rerender();
