/** Let badges overlap, keeping their centres 12px apart so each colour remains visible. */
export function separateClusters(points: { x: number; y: number; size: number }[]) {
  const placed: typeof points = [];
  return points.map(point => {
    let x = point.x, y = point.y;
    let attempt = 0;
    // ponytail: small visible cluster sets; use a spatial index if this grows to hundreds.
    while (placed.some(other => Math.hypot(x - other.x, y - other.y) < 12)) {
      const radius = 12 * (1 + Math.floor(attempt / 8));
      const angle = Math.PI / 2 + (attempt % 8) * Math.PI / 4;
      x = point.x + Math.cos(angle) * radius;
      y = point.y + Math.sin(angle) * radius;
      attempt++;
    }
    placed.push({ ...point, x, y });
    return { x: x - point.x, y: y - point.y };
  });
}
