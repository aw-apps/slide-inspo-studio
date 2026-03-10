const LS_KEY = 'slide-inspo-studio/doc/v1';

export function saveDocLocal(doc) {
  const next = structuredClone(doc);
  next.meta.updatedAt = Date.now();
  localStorage.setItem(LS_KEY, JSON.stringify(next));
}

export function loadDocLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function exportDocJson(doc) {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(doc.meta?.title || 'slide-doc').replace(/\s+/g, '-')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function importDocJson(file) {
  const text = await file.text();
  const doc = JSON.parse(text);
  // minimal safety checks
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.slides)) {
    throw new Error('Invalid document JSON');
  }
  return doc;
}
