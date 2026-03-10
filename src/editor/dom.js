export function getCanvasPoint(canvas, clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return { x: clientX - r.left, y: clientY - r.top };
}

export function applyElementStyle(node, geom) {
  const rot = Number.isFinite(geom.rotation) ? geom.rotation : 0;
  node.style.left = `${geom.x}px`;
  node.style.top = `${geom.y}px`;
  node.style.width = `${geom.w}px`;
  node.style.height = `${geom.h}px`;
  node.style.transform = `rotate(${rot}deg)`;
  node.style.transformOrigin = '50% 50%';
}
