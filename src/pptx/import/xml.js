export function parseXml(xmlText) {
  const p = new DOMParser();
  const doc = p.parseFromString(xmlText, 'application/xml');

  // Detect parser errors
  const err = doc.getElementsByTagName('parsererror')?.[0];
  if (err) {
    const msg = err.textContent || 'Unknown XML parse error';
    throw new Error(`Failed to parse PPTX XML: ${msg}`);
  }

  return doc;
}

/**
 * XPath helper that ignores namespaces using local-name().
 * @param {Node} context
 * @param {string} xpath
 */
export function xpathAll(context, xpath) {
  const doc = context.nodeType === 9 ? /** @type {Document} */ (context) : context.ownerDocument;
  if (!doc) return [];

  const res = doc.evaluate(xpath, context, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  /** @type {Node[]} */
  const out = [];
  for (let i = 0; i < res.snapshotLength; i++) out.push(res.snapshotItem(i));
  return out;
}

/** @param {Node} context @param {string} xpath */
export function xpathOne(context, xpath) {
  return xpathAll(context, xpath)[0] ?? null;
}

/** @param {Element | null} el @param {string} name */
export function attr(el, name) {
  if (!el) return null;
  const v = el.getAttribute(name);
  return v == null || v === '' ? null : v;
}
