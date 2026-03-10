import {
  createEmptyDoc,
  addSlide,
  addTextElement,
  addRectElement,
  updateElement,
  reorderLayer,
} from './core/index.mjs';

import { renderSlidesList, renderStage, renderLayers, renderInspector } from './ui/render.js';
import { saveDocLocal, loadDocLocal, exportDocJson, importDocJson } from './persistence/local.js';

let state = {
  doc: loadDocLocal() ?? createEmptyDoc(),
  selectedSlideId: null,
  selectedElementId: null,
};

function ensureSelection() {
  const slideExists = state.doc.slides.some(s => s.id === state.selectedSlideId);
  if (!state.selectedSlideId || !slideExists) state.selectedSlideId = state.doc.slides[0]?.id ?? null;

  const slide = state.doc.slides.find(s => s.id === state.selectedSlideId);
  const elExists = !!slide?.elements.some(e => e.id === state.selectedElementId);
  if (!elExists) state.selectedElementId = null;
}

function commitDoc(nextDoc) {
  state.doc = nextDoc;
  saveDocLocal(state.doc);
  rerender();
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
    onTextEdit: (elementId, text) => {
      const { doc } = updateElement(state.doc, state.selectedSlideId, elementId, { text });
      commitDoc(doc);
    },
  });

  renderLayers({
    doc: state.doc,
    selectedSlideId: state.selectedSlideId,
    selectedElementId: state.selectedElementId,
    onSelectElement: (id) => { state.selectedElementId = id; rerender(); },
    onReorder: (elementId, action) => {
      const { doc } = reorderLayer(state.doc, state.selectedSlideId, elementId, action);
      commitDoc(doc);
    },
  });

  renderInspector({
    doc: state.doc,
    selectedSlideId: state.selectedSlideId,
    selectedElementId: state.selectedElementId,
    onPatchElement: (patch) => {
      const { doc } = updateElement(state.doc, state.selectedSlideId, state.selectedElementId, patch);
      commitDoc(doc);
    },
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
  const { doc, slideId } = addSlide(state.doc);
  state.doc = doc;
  state.selectedSlideId = slideId;
  state.selectedElementId = null;
  saveDocLocal(state.doc);
  rerender();
});

document.getElementById('btn-add-text').addEventListener('click', () => {
  const { doc, elementId } = addTextElement(state.doc, state.selectedSlideId);
  state.doc = doc;
  state.selectedElementId = elementId;
  saveDocLocal(state.doc);
  rerender();
});

document.getElementById('btn-add-rect').addEventListener('click', () => {
  const { doc, elementId } = addRectElement(state.doc, state.selectedSlideId);
  state.doc = doc;
  state.selectedElementId = elementId;
  saveDocLocal(state.doc);
  rerender();
});

rerender();
