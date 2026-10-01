import assert from 'node:assert/strict'
import { separateClusters } from './clusterLayout.ts'

const points = [{ x: 0, y: 0, size: 40 }, { x: 0, y: 0, size: 40 }, { x: 12, y: 6, size: 40 }, { x: 300, y: 300, size: 36 }]
const offsets = separateClusters(points)
assert.deepEqual(offsets[0], { x: 0, y: 0 })
assert.deepEqual(offsets[3], { x: 0, y: 0 })
for (let i = 0; i < points.length; i++) {
  for (let j = 0; j < i; j++) {
    assert.ok(Math.hypot(points[i].x + offsets[i].x - points[j].x - offsets[j].x,
      points[i].y + offsets[i].y - points[j].y - offsets[j].y) >= 12)
  }
}
assert.ok(offsets.every(offset => Math.hypot(offset.x, offset.y) <= 12.01), 'Nearby badges should only move a few pixels')
assert.deepEqual(separateClusters([{ x: 0, y: 0, size: 40 }, { x: 13, y: 0, size: 40 }]),
  [{ x: 0, y: 0 }, { x: 0, y: 0 }], 'Partial overlap should stay in place')
assert.deepEqual(separateClusters(points), offsets, 'Repeated layout must not drift')
assert.deepEqual(separateClusters([]), [])
console.log('Cluster overlap checks passed.')
