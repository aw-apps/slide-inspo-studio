export function getCanvasPoint(canvas, clientX, clientY) {
  const r = canvas.getBoundingClientRect();

  // If the canvas is scaled via CSS transform, adjust from viewport pixels to canvas logical pixels.
  const scaleX = canvas.offsetWidth ? canvas.offsetWidth / r.width : 1;
  const scaleY = canvas.offsetHeight ? canvas.offsetHeight / r.height : 1;

  return { x: (clientX - r.left) * scaleX, y: (clientY - r.top) * scaleY };
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
