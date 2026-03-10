export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function snapAngleDeg(deg, step = 15, threshold = 4) {
  const s = step;
  const snapped = Math.round(deg / s) * s;
  if (Math.abs(snapped - deg) <= threshold) return snapped;
  return deg;
}

export function rectFromPoints(a, b) {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x, b.x);
  const y2 = Math.max(a.y, b.y);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function rectIntersects(a, b) {
  return a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;
}

export function rectUnion(rects) {
  if (!rects.length) return { x: 0, y: 0, w: 0, h: 0 };
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const r of rects) {
    x1 = Math.min(x1, r.x);
    y1 = Math.min(y1, r.y);
    x2 = Math.max(x2, r.x + r.w);
    y2 = Math.max(y2, r.y + r.h);
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function centerOfRect(r) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export function angleDegFromCenter(center, pt) {
  const a = Math.atan2(pt.y - center.y, pt.x - center.x);
  return (a * 180) / Math.PI;
}
