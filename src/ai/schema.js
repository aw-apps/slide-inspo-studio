export const AI_EXPORT_VERSION = 1;

/**
 * AI Export (v1)
 *
 * Contract goals:
 * - Deterministic: same input doc => byte-identical JSON (no timestamps).
 * - Masters/layouts/templates are separated from slide instances.
 * - Assets are referenced by hash-based IDs and packaged deterministically.
 */

/**
 * @typedef {{
 *   version: 1,
 *   doc: { title: string, page: { w: number, h: number } },
 *   templates: { masters: any[] },
 *   styleTokens: any,
 *   assets: any[],
 *   slides: any[]
 * }} AIExportV1
 */
