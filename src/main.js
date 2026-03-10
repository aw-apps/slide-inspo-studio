import {
  createEmptyDoc,
  addSlide,
  addTextElement,
  addRectElement,
  patchElements,
  reorderLayer,
  createHistory,
  pushHistory,
  undo,
  redo,
  canUndo,
  canRedo,
} from './core/index.mjs';

import { renderSlidesList, renderStage, renderLayers, renderInspector } from './ui/render.js';
import { saveDocLocal, loadDocLocal, exportDocJson, importDocJson } from './persistence/local.js';
import { importPptxFile } from './pptx/import/index.js';
import { exportPptxFile } from './pptx/export/index.js';

let state = {
  doc: loadDocLocal() ?? createEmptyDoc(),
  history: createHistory({ limit: 200 }),
  selectedSlideId: null,
  selectedElementIds: [],
};

function ensureSelection() {
  const slideExists = state.doc.slides.some(s => s.id === state.selectedSlideId);
  if (!state.selectedSlideId || !slideExists) state.selectedSlideId = state.doc.slides[0]?.id ?? null;

  const slide = state.doc.slides.find(s => s.id === state.selectedSlideId);
  const existing = new Set((slide?.elements || []).map(e => e.id));
  state.selectedElementIds = (state.selectedElementIds || []).filter(id => existing.has(id));
}

function setSelectedElementIds(ids, opts = {}) {
  state.selectedElementIds = Array.from(new Set(ids || [])).filter(Boolean);
  if (opts.rerender !== false) rerender();
}

function commitDoc(nextDoc, opts = {}) {
  const push = opts.history !== false;
  if (push) state.history = pushHistory(state.history, state.doc);

  state.doc = nextDoc;
  saveDocLocal(state.doc);
  rerender();
}

function commitElementPatches(patchesById, opts = {}) {
  const slideId = state.selectedSlideId;
  if (!slideId) return;

  if (opts?.rerenderOnly) {
    rerender();
    return;
  }

  const { doc: next, updated } = patchElements(state.doc, slideId, patchesById);
  if (!updated) {
    rerender();
    return;
  }

  commitDoc(next, { history: true });
}

function doUndo() {
  const r = undo(state.history, state.doc);
  if (!r.ok) return;
  state.history = r.history;
  state.doc = r.doc;
  saveDocLocal(state.doc);
  rerender();
}

function doRedo() {
  const r = redo(state.history, state.doc);
  if (!r.ok) return;
  state.history = r.history;
  state.doc = r.doc;
  saveDocLocal(state.doc);
  rerender();
}

function rerender() {
  ensureSelection();

  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');
  if (undoBtn) undoBtn.disabled = !canUndo(state.history);
  if (redoBtn) redoBtn.disabled = !canRedo(state.history);

  renderSlidesList({
    doc: state.doc,
    selectedSlideId: state.selectedSlideId,
    onSelect: (id) => {
      state.selectedSlideId = id;
      state.selectedElementIds = [];
      rerender();
    },
  });

  renderStage({
    doc: state.doc,
    selectedSlideId: state.selectedSlideId,
    getSelectedElementIds: () => state.selectedElementIds,
    setSelectedElementIds,
    commitElementPatches,
    onTextEdit: (elementId, text) => {
      commitElementPatches({ [elementId]: { text } });
    },
  });

  renderLayers({
    doc: state.doc,
    selectedSlideId: state.selectedSlideId,
    selectedElementIds: state.selectedElementIds,
    onSelectElement: (id, opts = {}) => {
      if (!id) return setSelectedElementIds([]);
      if (opts.toggle) {
        const cur = new Set(state.selectedElementIds);
        if (cur.has(id)) cur.delete(id);
        else cur.add(id);
        setSelectedElementIds([...cur]);
      } else {
        setSelectedElementIds([id]);
      }
    },
    onReorder: (elementId, action) => {
      const { doc } = reorderLayer(state.doc, state.selectedSlideId, elementId, action);
      commitDoc(doc, { history: true });
    },
  });

  renderInspector({
    doc: state.doc,
    selectedSlideId: state.selectedSlideId,
    selectedElementIds: state.selectedElementIds,
    onPatchElement: (patch) => {
      if (state.selectedElementIds.length !== 1) return;
      commitElementPatches({ [state.selectedElementIds[0]]: patch });
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
  state.history = createHistory({ limit: 200 });
  state.selectedSlideId = null;
  state.selectedElementIds = [];
  saveDocLocal(state.doc);
  rerender();
  setTab('editor');
});

document.getElementById('btn-save').addEventListener('click', () => {
  saveDocLocal(state.doc);
  alert('Saved to localStorage');
});

document.getElementById('btn-export').addEventListener('click', () => exportDocJson(state.doc));

document.getElementById('btn-export-pptx').addEventListener('click', () => {
  try {
    exportPptxFile(state.doc);
  } catch (err) {
    console.error(err);
    alert(`PPTX export failed: ${err?.message || String(err)}`);
  }
});

document.getElementById('file-import').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const doc = await importDocJson(file);
  state.doc = doc;
  state.history = createHistory({ limit: 200 });
  state.selectedSlideId = null;
  state.selectedElementIds = [];
  saveDocLocal(state.doc);
  rerender();
  setTab('editor');
  e.target.value = '';
});

document.getElementById('file-import-pptx').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const doc = await importPptxFile(file);
    state.doc = doc;
    state.history = createHistory({ limit: 200 });
    state.selectedSlideId = null;
    state.selectedElementIds = [];
    saveDocLocal(state.doc);
    rerender();
    setTab('editor');
  } catch (err) {
    console.error(err);
    alert(`PPTX import failed: ${err?.message || String(err)}`);
  } finally {
    e.target.value = '';
  }
});

document.getElementById('btn-add-slide').addEventListener('click', () => {
  const { doc, slideId } = addSlide(state.doc);
  state.selectedSlideId = slideId;
  state.selectedElementIds = [];
  commitDoc(doc, { history: true });
});

document.getElementById('btn-add-text').addEventListener('click', () => {
  const { doc, elementId } = addTextElement(state.doc, state.selectedSlideId);
  commitDoc(doc, { history: true });
  setSelectedElementIds([elementId]);
});

document.getElementById('btn-add-rect').addEventListener('click', () => {
  const { doc, elementId } = addRectElement(state.doc, state.selectedSlideId);
  commitDoc(doc, { history: true });
  setSelectedElementIds([elementId]);
});

document.getElementById('btn-undo')?.addEventListener('click', () => doUndo());
document.getElementById('btn-redo')?.addEventListener('click', () => doRedo());

window.addEventListener('keydown', (ev) => {
  const editorHidden = document.getElementById('view-editor')?.classList.contains('hidden');
  if (editorHidden) return;

  const a = document.activeElement;
  const tag = a?.tagName?.toLowerCase?.();
  if (a?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select') return;

  const mod = ev.metaKey || ev.ctrlKey;
  if (mod && ev.key.toLowerCase() === 'z' && !ev.shiftKey) {
    ev.preventDefault();
    doUndo();
    return;
  }
  if ((mod && ev.key.toLowerCase() === 'y') || (mod && ev.shiftKey && ev.key.toLowerCase() === 'z')) {
    ev.preventDefault();
    doRedo();
    return;
  }

  const ids = state.selectedElementIds;
  if (!ids.length) return;

  let dx = 0;
  let dy = 0;
  const step = ev.shiftKey ? 10 : 1;

  if (ev.key === 'ArrowLeft') dx = -step;
  if (ev.key === 'ArrowRight') dx = step;
  if (ev.key === 'ArrowUp') dy = -step;
  if (ev.key === 'ArrowDown') dy = step;

  if (!dx && !dy) return;
  ev.preventDefault();

  const slide = state.doc.slides.find(s => s.id === state.selectedSlideId);
  if (!slide) return;

  const patches = {};
  for (const id of ids) {
    const el = slide.elements.find(e => e.id === id);
    if (!el) continue;
    patches[id] = { x: el.x + dx, y: el.y + dy };
  }
  commitElementPatches(patches);
});

rerender();
