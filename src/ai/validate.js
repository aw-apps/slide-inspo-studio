import { AI_EXPORT_VERSION } from './schema.js';

function isObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isString(v) {
  return typeof v === 'string';
}

function isNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Lightweight validator for AI export objects.
 * @param {any} exp
 */
export function validateAIExport(exp) {
  /** @type {string[]} */
  const errors = [];

  if (!isObject(exp)) return { ok: false, errors: ['export must be an object'] };
  if (exp.version !== AI_EXPORT_VERSION) errors.push(`version must be ${AI_EXPORT_VERSION}`);

  if (!isObject(exp.doc)) errors.push('doc must be an object');
  else {
    if (!isString(exp.doc.title)) errors.push('doc.title must be a string');
    if (!isObject(exp.doc.page)) errors.push('doc.page must be an object');
    else {
      if (!isNumber(exp.doc.page.w)) errors.push('doc.page.w must be a number');
      if (!isNumber(exp.doc.page.h)) errors.push('doc.page.h must be a number');
    }
  }

  if (!isObject(exp.templates)) errors.push('templates must be an object');
  else if (!Array.isArray(exp.templates.masters)) errors.push('templates.masters must be an array');

  if (!isObject(exp.styleTokens)) errors.push('styleTokens must be an object');
  if (!Array.isArray(exp.assets)) errors.push('assets must be an array');
  if (!Array.isArray(exp.slides)) errors.push('slides must be an array');

  return { ok: errors.length === 0, errors };
}

export function assertValidAIExport(exp) {
  const r = validateAIExport(exp);
  if (!r.ok) throw new Error(`Invalid AI export:\n${r.errors.join('\n')}`);
}
