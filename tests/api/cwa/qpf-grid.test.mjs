import assert from 'node:assert/strict'
import { parseQpfWindow, QPF_BOUNDS } from '../../../api/cwa/qpf-grid.js'
import { bandIndex, QPF_SCALE } from '../../../src/lib/rainfallMap.ts'

const row = i => Array.from({ length: 130 }, (_, j) => (i === 0 && j === 0 ? '1.2598824e-01' : i === 0 && j === 1 ? '-9.9e+01' : '3.05e+00')).join(',')
const json = text => ({ cwaopendata: { Dataset: {
  DatasetInfo: { IssueTime: '2026-07-12T02:00:00+08:00', StartTime: '2026-07-12T02:00:00+08:00', EndTime: '2026-07-12T08:00:00+08:00' },
  Contents: { Content: { ContentText: text } },
} } })

const parsed = parseQpfWindow(json(Array.from({ length: 130 }, (_, i) => row(i)).join('\n')))
assert.equal(parsed.values.length, 130 * 130)
assert.equal(parsed.values[0], 0.1)
assert.equal(parsed.values[1], null, 'negative values are missing, not rain')
assert.equal(parsed.values[2], 3.1)
assert.equal(parsed.end, '2026-07-12T08:00:00+08:00')
const oneLine = parseQpfWindow(json(Array.from({ length: 130 }, (_, i) => row(i)).join(',')))
assert.deepEqual(oneLine.values, parsed.values, 'live files put every value on one line')
assert.throws(() => parseQpfWindow(json(row(0))), /layout/)
assert.ok(QPF_BOUNDS.south < 20.8 && QPF_BOUNDS.north > 26.65)

assert.deepEqual(QPF_SCALE.slice(0, 5).map(s => s.min), [0.5, 1, 2, 5, 10])
assert.equal(bandIndex(0.4, QPF_SCALE), -1)
assert.equal(bandIndex(0.5, QPF_SCALE), 0)
assert.equal(bandIndex(5.9, QPF_SCALE), 3)
assert.equal(bandIndex(999, QPF_SCALE), 16)
console.log('qpf-grid ok')
