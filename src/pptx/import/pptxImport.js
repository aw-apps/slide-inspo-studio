import { createEmptyDoc, createId } from '../../core/index.mjs';
import { ZipReader } from './zip.js';
import { parseXml, xpathAll, xpathOne, attr } from './xml.js';

const EMU_PER_INCH = 914400;
const PX_PER_INCH = 96;
const EMU_PER_PX = EMU_PER_INCH / PX_PER_INCH; // 9525

function emuToPx(emu) {
  const n = Number(emu);
  if (!Number.isFinite(n)) return 0;
  return n / EMU_PER_PX;
}

function rotToDeg(rotAttr) {
  const n = Number(rotAttr);
  if (!Number.isFinite(n)) return 0;
  // OOXML rotation is in 60000ths of a degree.
  return n / 60000;
}

function srgbToHex(val) {
  const v = (val || '').trim();
  if (!v) return null;
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v.toLowerCase()}`;
  return null;
}

function firstTextStyle(txBodyEl) {
  // Best-effort: take first run's rPr.
  const rPr = xpathOne(txBodyEl, ".//*[local-name()='rPr']");
  if (!rPr || rPr.nodeType !== 1) return {};

  const sz = attr(/** @type {Element} */ (rPr), 'sz');
  let fontSizePx = null;
  if (sz != null) {
    // sz is in 1/100 pt
    const pt = Number(sz) / 100;
    if (Number.isFinite(pt) && pt > 0) fontSizePx = (pt * PX_PER_INCH) / 72;
  }

  const latin = xpathOne(rPr, ".//*[local-name()='latin']");
  const fontFamily = latin && latin.nodeType === 1 ? attr(/** @type {Element} */ (latin), 'typeface') : null;

  const rgb = xpathOne(rPr, ".//*[local-name()='solidFill']//*[local-name()='srgbClr']");
  const color = rgb && rgb.nodeType === 1 ? srgbToHex(attr(/** @type {Element} */ (rgb), 'val')) : null;

  return {
    fontSize: fontSizePx,
    fontFamily,
    color,
  };
}

function textAlign(txBodyEl) {
  const pPr = xpathOne(txBodyEl, ".//*[local-name()='pPr']");
  if (!pPr || pPr.nodeType !== 1) return null;
  const a = attr(/** @type {Element} */ (pPr), 'algn');
  if (a === 'ctr') return 'center';
  if (a === 'r') return 'right';
  if (a === 'l') return 'left';
  return null;
}

function extractText(txBodyEl) {
  const paras = xpathAll(txBodyEl, "./*[local-name()='p']");
  /** @type {string[]} */
  const out = [];

  for (const p of paras) {
    const ts = xpathAll(p, ".//*[local-name()='t']");
    const parts = ts.map(n => n.textContent ?? '');
    const line = parts.join('');
    out.push(line);
  }

  // Trim trailing empty lines, keep internal empties.
  while (out.length && out[out.length - 1] === '') out.pop();
  return out.join('\n');
}

function fillColor(spEl) {
  const solid = xpathOne(spEl, ".//*[local-name()='spPr']//*[local-name()='solidFill']//*[local-name()='srgbClr']");
  const hex = solid && solid.nodeType === 1 ? srgbToHex(attr(/** @type {Element} */ (solid), 'val')) : null;
  return hex;
}

function presetGeom(spEl) {
  const prst = xpathOne(spEl, ".//*[local-name()='spPr']//*[local-name()='prstGeom']");
  if (!prst || prst.nodeType !== 1) return null;
  return attr(/** @type {Element} */ (prst), 'prst');
}

function elementName(spEl) {
  const cNvPr = xpathOne(spEl, ".//*[local-name()='nvSpPr']//*[local-name()='cNvPr']");
  if (!cNvPr || cNvPr.nodeType !== 1) return null;
  return attr(/** @type {Element} */ (cNvPr), 'name');
}

function elementSourceId(spEl) {
  const cNvPr = xpathOne(spEl, ".//*[local-name()='nvSpPr']//*[local-name()='cNvPr']");
  if (!cNvPr || cNvPr.nodeType !== 1) return null;
  return attr(/** @type {Element} */ (cNvPr), 'id');
}

function extractBox(spEl) {
  const xfrm = xpathOne(spEl, ".//*[local-name()='xfrm']");
  if (!xfrm || xfrm.nodeType !== 1) return null;

  const off = xpathOne(xfrm, "./*[local-name()='off']");
  const ext = xpathOne(xfrm, "./*[local-name()='ext']");
  if (!off || !ext || off.nodeType !== 1 || ext.nodeType !== 1) return null;

  const x = emuToPx(attr(/** @type {Element} */ (off), 'x'));
  const y = emuToPx(attr(/** @type {Element} */ (off), 'y'));
  const w = emuToPx(attr(/** @type {Element} */ (ext), 'cx'));
  const h = emuToPx(attr(/** @type {Element} */ (ext), 'cy'));

  const rot = rotToDeg(attr(/** @type {Element} */ (xfrm), 'rot'));

  return {
    x,
    y,
    w: Math.max(1, w),
    h: Math.max(1, h),
    rotation: rot || 0,
  };
}

function parseSlideBackground(slideDoc) {
  const bg = xpathOne(slideDoc, "//*[local-name()='cSld']/*[local-name()='bg']//*[local-name()='bgPr']//*[local-name()='solidFill']//*[local-name()='srgbClr']");
  if (bg && bg.nodeType === 1) {
    const c = srgbToHex(attr(/** @type {Element} */ (bg), 'val'));
    if (c) return { color: c };
  }
  return null;
}

function parseSlideElements(slideDoc) {
  /** @type {any[]} */
  const elements = [];

  // Only parse top-level shapes for v1.
  const shapes = xpathAll(slideDoc, "//*[local-name()='spTree']/*[local-name()='sp']");

  for (const sp of shapes) {
    if (sp.nodeType !== 1) continue;
    const spEl = /** @type {Element} */ (sp);
    const box = extractBox(spEl);
    if (!box) continue;

    const txBody = xpathOne(spEl, "./*[local-name()='txBody']");

    const name = elementName(spEl);
    const srcId = elementSourceId(spEl);

    if (txBody && txBody.nodeType === 1) {
      const t = extractText(/** @type {Element} */ (txBody));
      // Skip empty text boxes (but keep as annotation)
      if (t.trim().length === 0) {
        elements.push({
          id: createId(),
          type: 'rect',
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          rotation: box.rotation,
          fill: 'transparent',
          radius: 0,
          name,
          _pptx: { kind: 'textBox', sourceId: srcId, empty: true },
        });
        continue;
      }

      const style = firstTextStyle(/** @type {Element} */ (txBody));
      const align = textAlign(/** @type {Element} */ (txBody));

      elements.push({
        id: createId(),
        type: 'text',
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        rotation: box.rotation,
        text: t,
        fontSize: Math.max(8, Math.round(style.fontSize ?? 28)),
        color: style.color ?? '#111111',
        fontFamily: style.fontFamily ?? undefined,
        align: align ?? undefined,
        name,
        _pptx: { kind: 'text', sourceId: srcId },
      });
      continue;
    }

    const fill = fillColor(spEl) ?? '#e9ecff';
    const prst = presetGeom(spEl);
    const radius = prst === 'roundRect' ? 12 : 0;

    elements.push({
      id: createId(),
      type: 'rect',
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      rotation: box.rotation,
      fill,
      radius,
      name,
      _pptx: { kind: 'shape', sourceId: srcId, prst },
    });
  }

  // TODO(v1): group shapes, images, connectors, charts, etc.

  return elements;
}

function parsePresentationInfo(presDoc) {
  const sldSz = xpathOne(presDoc, "//*[local-name()='presentation']/*[local-name()='sldSz']");
  let size = null;
  if (sldSz && sldSz.nodeType === 1) {
    const el = /** @type {Element} */ (sldSz);
    const cx = attr(el, 'cx');
    const cy = attr(el, 'cy');
    if (cx != null && cy != null) {
      size = { cx: Number(cx), cy: Number(cy) };
    }
  }

  const sldIds = xpathAll(presDoc, "//*[local-name()='sldIdLst']/*[local-name()='sldId']");
  /** @type {string[]} */
  const rIds = [];
  for (const n of sldIds) {
    if (n.nodeType !== 1) continue;
    const el = /** @type {Element} */ (n);
    // relationship id is in r:id but DOM returns it as 'r:id' attribute name.
    const rid = el.getAttribute('r:id');
    if (rid) rIds.push(rid);
  }

  return { size, rIds };
}

function parseRels(relsDoc) {
  const rels = xpathAll(relsDoc, "//*[local-name()='Relationship']");
  /** @type {Map<string, string>} */
  const map = new Map();

  for (const n of rels) {
    if (n.nodeType !== 1) continue;
    const el = /** @type {Element} */ (n);
    const id = attr(el, 'Id');
    const target = attr(el, 'Target');
    if (id && target) map.set(id, target);
  }

  return map;
}

function normalizePptTarget(target) {
  let t = String(target || '').trim();
  if (!t) return null;
  if (t.startsWith('/')) t = t.slice(1);
  // Targets in ppt/_rels/presentation.xml.rels are typically relative to ppt/.
  // Some producers emit ../slides/slide1.xml; normalize that too.
  while (t.startsWith('../')) t = t.slice(3);
  if (t.startsWith('ppt/')) return t;
  return `ppt/${t}`;
}

export async function importPptxArrayBuffer(arrayBuffer, opts = {}) {
  const zip = new ZipReader(arrayBuffer);

  const presXml = await zip.readText('ppt/presentation.xml');
  const presRelsXml = await zip.readText('ppt/_rels/presentation.xml.rels');

  const presDoc = parseXml(presXml);
  const relsDoc = parseXml(presRelsXml);

  const { size, rIds } = parsePresentationInfo(presDoc);
  const rels = parseRels(relsDoc);

  const slidePaths = rIds
    .map(rid => rels.get(rid))
    .filter(Boolean)
    .map(t => normalizePptTarget(t))
    .filter(Boolean);

  const slideSizePx = size
    ? { w: emuToPx(size.cx), h: emuToPx(size.cy) }
    : { w: 960, h: 540 };

  const doc = createEmptyDoc();
  doc.meta.title = (opts.title || doc.meta.title);

  // Store extracted slide size and use it for rendering/geometry.
  doc.meta.page = { w: Math.round(slideSizePx.w), h: Math.round(slideSizePx.h) };
  doc.meta._pptx = {
    slideSizeEmu: size,
    slideSizePx,
    slideCount: slidePaths.length,
  };

  doc.slides = [];

  for (let i = 0; i < slidePaths.length; i++) {
    const path = slidePaths[i];
    const slideXml = await zip.readText(path);
    const slideDoc = parseXml(slideXml);

    const bg = parseSlideBackground(slideDoc);
    const elements = parseSlideElements(slideDoc);

    doc.slides.push({
      id: createId(),
      name: `Slide ${i + 1}`,
      masterId: 'master-default',
      layoutId: 'layout-title',
      elements,
      ...(bg ? { bg } : {}),
      _pptx: { sourcePath: path },
    });
  }

  // Fallback: if presentation.xml had no slide id list, try sequential slide files.
  if (doc.slides.length === 0) {
    const all = zip.list().filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p));
    all.sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml/)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)\.xml/)?.[1] ?? 0);
      return na - nb;
    });

    for (let i = 0; i < all.length; i++) {
      const path = all[i];
      const slideXml = await zip.readText(path);
      const slideDoc = parseXml(slideXml);

      const bg = parseSlideBackground(slideDoc);
      const elements = parseSlideElements(slideDoc);

      doc.slides.push({
        id: createId(),
        name: `Slide ${i + 1}`,
        masterId: 'master-default',
        layoutId: 'layout-title',
        elements,
        ...(bg ? { bg } : {}),
        _pptx: { sourcePath: path, fallback: true },
      });
    }
  }

  if (doc.slides.length === 0) {
    throw new Error('No slides found in PPTX');
  }

  return doc;
}
