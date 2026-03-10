import { migrateDoc, assertValidDoc } from '../core/index.mjs';

const LS_KEY = 'slide-inspo-studio/doc/v1';

export function saveDocLocal(doc) {
  const next = structuredClone(doc);
  next.meta.updatedAt = Date.now();
  assertValidDoc(next);
  localStorage.setItem(LS_KEY, JSON.stringify(next));
}

export function loadDocLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const migrated = migrateDoc(parsed);
    assertValidDoc(migrated);
    return migrated;
  } catch {
    return null;
  }
}

export function exportDocJson(doc) {
  const migrated = migrateDoc(doc);
  assertValidDoc(migrated);
  const blob = new Blob([JSON.stringify(migrated, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(migrated.meta?.title || 'slide-doc').replace(/\s+/g, '-')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function importDocJson(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const migrated = migrateDoc(parsed);
  assertValidDoc(migrated);
  return migrated;
}
