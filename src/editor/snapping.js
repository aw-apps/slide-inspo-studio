import { rectUnion } from './geometry.js';

const DEFAULT_THRESHOLD = 6;

function uniq(nums) {
  const out = [];
  const seen = new Set();
  for (const n of nums) {
    const k = String(n);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out;
}

export function computeSnapForMove({
  selectedRects,
  otherRects,
  slideW,
  slideH,
  dx,
  dy,
  threshold = DEFAULT_THRESHOLD,
}) {
  const bbox = rectUnion(selectedRects);
  const next = { x: bbox.x + dx, y: bbox.y + dy, w: bbox.w, h: bbox.h };

  const vGuides = [];
  const hGuides = [];

  const slideV = [0, slideW / 2, slideW];
  const slideHh = [0, slideH / 2, slideH];

  const otherV = [];
  const otherH = [];
  for (const r of otherRects) {
    otherV.push(r.x, r.x + r.w / 2, r.x + r.w);
    otherH.push(r.y, r.y + r.h / 2, r.y + r.h);
  }

  const candidatesV = uniq([...slideV, ...otherV]);
  const candidatesH = uniq([...slideHh, ...otherH]);

  const pointsV = [
    { k: 'left', v: next.x },
    { k: 'center', v: next.x + next.w / 2 },
    { k: 'right', v: next.x + next.w },
  ];
  const pointsH = [
    { k: 'top', v: next.y },
    { k: 'middle', v: next.y + next.h / 2 },
    { k: 'bottom', v: next.y + next.h },
  ];

  let bestDx = 0;
  let bestDxAbs = Infinity;
  let bestV = null;

  for (const p of pointsV) {
    for (const c of candidatesV) {
      const diff = c - p.v;
      const ad = Math.abs(diff);
      if (ad <= threshold && ad < bestDxAbs) {
        bestDxAbs = ad;
        bestDx = diff;
        bestV = c;
      }
    }
  }

  let bestDy = 0;
  let bestDyAbs = Infinity;
  let bestH = null;

  for (const p of pointsH) {
    for (const c of candidatesH) {
      const diff = c - p.v;
      const ad = Math.abs(diff);
      if (ad <= threshold && ad < bestDyAbs) {
        bestDyAbs = ad;
        bestDy = diff;
        bestH = c;
      }
    }
  }

  if (bestV != null) vGuides.push(bestV);
  if (bestH != null) hGuides.push(bestH);

  return {
    dx: dx + bestDx,
    dy: dy + bestDy,
    guides: { v: vGuides, h: hGuides },
  };
}
