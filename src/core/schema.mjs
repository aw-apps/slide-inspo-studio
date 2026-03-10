export const SCHEMA_VERSION = 1;

/**
 * Internal document model (v1).
 *
 * Notes:
 * - This schema is the single source of truth.
 * - UI/editor state (selection, viewport, etc.) should live outside the document.
 */

/** @typedef {string} ID */

/**
 * @typedef {{
 *   schemaVersion: number,
 *   meta: { title: string, createdAt: number, updatedAt: number },
 *   masters: MasterV1[],
 *   slides: SlideV1[],
 *   assets: AssetV1[]
 * }} DocV1
 */

/**
 * @typedef {{
 *   id: ID,
 *   name: string,
 *   layouts: LayoutV1[],
 *   theme: {
 *     fonts: { body: string, heading: string },
 *     colors: { text: string, bg: string, accent: string }
 *   }
 * }} MasterV1
 */

/**
 * @typedef {{
 *   id: ID,
 *   name: string,
 *   placeholders: PlaceholderV1[]
 * }} LayoutV1
 */

/**
 * @typedef {{
 *   id: ID,
 *   type: 'text'|'image'|'shape',
 *   name?: string
 * }} PlaceholderV1
 */

/**
 * @typedef {{
 *   id: ID,
 *   name: string,
 *   masterId: ID,
 *   layoutId: ID,
 *   elements: ElementV1[]
 * }} SlideV1
 */

/**
 * Shared geometry.
 * @typedef {{ x: number, y: number, w: number, h: number, rotation?: number }} Box
 */

/**
 * @typedef {{
 *   id: ID,
 *   type: 'text',
 *   x: number, y: number, w: number, h: number,
 *   rotation?: number,
 *   text: string,
 *   fontSize: number,
 *   color: string,
 *   fontFamily?: string,
 *   align?: 'left'|'center'|'right'
 * } | {
 *   id: ID,
 *   type: 'rect',
 *   x: number, y: number, w: number, h: number,
 *   rotation?: number,
 *   fill: string,
 *   stroke?: string,
 *   radius?: number
 * } | {
 *   id: ID,
 *   type: 'image',
 *   x: number, y: number, w: number, h: number,
 *   rotation?: number,
 *   assetId: ID,
 *   crop?: { x: number, y: number, w: number, h: number }
 * })} ElementV1
 */

/**
 * @typedef {{
 *   id: ID,
 *   type: 'image',
 *   name?: string,
 *   mime: string,
 *   src: string
 * }} AssetV1
 */

export function createId() {
  const uuid = globalThis?.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `id-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

/** @returns {DocV1} */
export function createEmptyDoc() {
  const now = Date.now();
  const slideId = createId();
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: { title: 'Untitled', createdAt: now, updatedAt: now },
    masters: [
      {
        id: 'master-default',
        name: 'Default Master',
        layouts: [
          { id: 'layout-title', name: 'Title', placeholders: [] },
          { id: 'layout-title-content', name: 'Title + Content', placeholders: [] },
        ],
        theme: {
          fonts: { body: 'Inter, system-ui', heading: 'Inter, system-ui' },
          colors: { text: '#111111', bg: '#ffffff', accent: '#2b4cff' },
        },
      },
    ],
    slides: [
      { id: slideId, name: 'Slide 1', masterId: 'master-default', layoutId: 'layout-title', elements: [] },
    ],
    assets: [],
  };
}
