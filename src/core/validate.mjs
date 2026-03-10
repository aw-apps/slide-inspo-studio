import { SCHEMA_VERSION } from './schema.mjs';

function isObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isId(v) {
  return typeof v === 'string' && v.length > 0;
}

function isNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Lightweight validator: returns a list of human-readable errors.
 * @param {any} doc
 */
export function validateDoc(doc) {
  /** @type {string[]} */
  const errors = [];

  if (!isObject(doc)) {
    return { ok: false, errors: ['doc must be an object'] };
  }

  if (doc.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${SCHEMA_VERSION}`);
  }

  if (!isObject(doc.meta)) errors.push('meta must be an object');
  else {
    if (typeof doc.meta.title !== 'string') errors.push('meta.title must be a string');
    if (!isNumber(doc.meta.createdAt)) errors.push('meta.createdAt must be a number');
    if (!isNumber(doc.meta.updatedAt)) errors.push('meta.updatedAt must be a number');
  }

  if (!Array.isArray(doc.masters)) errors.push('masters must be an array');
  if (!Array.isArray(doc.slides)) errors.push('slides must be an array');
  if (!Array.isArray(doc.assets)) errors.push('assets must be an array');

  /** @type {Set<string>} */
  const masterIds = new Set();
  if (Array.isArray(doc.masters)) {
    for (const m of doc.masters) {
      if (!isObject(m)) { errors.push('master must be an object'); continue; }
      if (!isId(m.id)) errors.push('master.id must be a string');
      else masterIds.add(m.id);
      if (typeof m.name !== 'string') errors.push('master.name must be a string');
      if (!Array.isArray(m.layouts)) errors.push('master.layouts must be an array');
    }
  }

  /** @type {Set<string>} */
  const layoutIdsByMaster = new Set();
  if (Array.isArray(doc.masters)) {
    for (const m of doc.masters) {
      if (!isObject(m) || !Array.isArray(m.layouts) || !isId(m.id)) continue;
      for (const l of m.layouts) {
        if (!isObject(l)) { errors.push('layout must be an object'); continue; }
        if (!isId(l.id)) errors.push('layout.id must be a string');
        if (typeof l.name !== 'string') errors.push('layout.name must be a string');
        // pair key for quick existence checks: masterId/layoutId
        if (isId(l.id)) layoutIdsByMaster.add(`${m.id}/${l.id}`);
      }
    }
  }

  if (Array.isArray(doc.slides)) {
    for (const s of doc.slides) {
      if (!isObject(s)) { errors.push('slide must be an object'); continue; }
      if (!isId(s.id)) errors.push('slide.id must be a string');
      if (typeof s.name !== 'string') errors.push('slide.name must be a string');
      if (!isId(s.masterId) || !masterIds.has(s.masterId)) errors.push('slide.masterId must reference an existing master');
      if (!isId(s.layoutId) || !layoutIdsByMaster.has(`${s.masterId}/${s.layoutId}`)) errors.push('slide.layoutId must reference an existing layout for the master');
      if (!Array.isArray(s.elements)) errors.push('slide.elements must be an array');
      else {
        for (const e of s.elements) {
          if (!isObject(e)) { errors.push('element must be an object'); continue; }
          if (!isId(e.id)) errors.push('element.id must be a string');
          if (typeof e.type !== 'string') errors.push('element.type must be a string');
          for (const k of ['x','y','w','h']) {
            if (!isNumber(e[k])) errors.push(`element.${k} must be a number`);
          }
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function assertValidDoc(doc) {
  const res = validateDoc(doc);
  if (!res.ok) {
    const msg = res.errors.join('\n');
    throw new Error(`Invalid document:\n${msg}`);
  }
}
