export interface RainfallMap {
  from: string
  observedAt: string
  bounds: { north: number; south: number; east: number; west: number }
  image: string
}

// Small-interval scale from CWA O-A0040-002; each colour covers [upper bound of previous, its own bound).
export const RAINFALL_SCALE: { min: number; color: string }[] = [
  { min: 0, color: '#c1c1c1' }, { min: 1, color: '#99ffff' }, { min: 2, color: '#00ccff' },
  { min: 6, color: '#0099ff' }, { min: 10, color: '#0066ff' }, { min: 15, color: '#339900' },
  { min: 20, color: '#33ff00' }, { min: 30, color: '#ffff00' }, { min: 40, color: '#ffcc00' },
  { min: 50, color: '#ff9900' }, { min: 70, color: '#ff0000' }, { min: 90, color: '#cc0000' },
  { min: 110, color: '#990000' }, { min: 130, color: '#990099' }, { min: 150, color: '#cc00cc' },
  { min: 200, color: '#ff00ff' }, { min: 300, color: '#ffccff' },
]

// QPF pictures and grids use the same colours, with 0.5 and 5 in place of 0 and 6.
export const QPF_SCALE = RAINFALL_SCALE.map((step, i) => ({ ...step, min: [0.5, 1, 2, 5][i] ?? step.min }))

export type RainScale = typeof RAINFALL_SCALE

/** Scale band for a value, or -1 below the first band. */
export function bandIndex(value: number, scale: RainScale) {
  let band = -1
  scale.forEach((step, i) => { if (value >= step.min) band = i })
  return band
}

export interface QpfWindow { issuedAt: string; start: string; end: string; values: (number | null)[] }
export type QpfGrid =
  | { active: false; issuedAt: string }
  | { active: true; issuedAt: string; rows: number; cols: number; bounds: RainfallMap['bounds']; windows: QpfWindow[] }

/** Grid rows run south→north; the image is drawn north-up, one pixel per grid cell. */
export function gridToImage(values: (number | null)[], rows: number, cols: number, scale: RainScale) {
  const canvas = document.createElement('canvas')
  canvas.width = cols
  canvas.height = rows
  const ctx = canvas.getContext('2d')!
  values.forEach((value, i) => {
    const band = value == null ? -1 : bandIndex(value, scale)
    if (band < 0) return
    ctx.fillStyle = scale[band].color
    ctx.fillRect(i % cols, rows - 1 - Math.floor(i / cols), 1, 1)
  })
  return canvas.toDataURL('image/png')
}

export async function fetchQpfGrid(): Promise<QpfGrid> {
  const res = await fetch('/api/cwa/qpf-grid')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const mercY =(lat: number) => Math.asinh(Math.tan(lat * Math.PI / 180))

/** Source row (equirectangular image) that belongs at Mercator output row `row`. */
export function sourceRow(row: number, height: number, north: number, south: number) {
  const y = mercY(north) - (row + 0.5) / height * (mercY(north) - mercY(south))
  const lat = Math.atan(Math.sinh(y)) * 180 / Math.PI
  return Math.min(height - 1, Math.max(0, Math.floor((north - lat) / (north - south) * height)))
}

const SCALE_RGB = RAINFALL_SCALE.map(({ color }) => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)))

/** Highest scale band present in RGBA pixels, or -1 when nothing is coloured (no rain yet). */
export function maxRainIndex(pixels: Uint8ClampedArray): number {
  const seen = new Map<number, number>()
  let max = -1
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue
    const key = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2]
    let band = seen.get(key)
    if (band === undefined) {
      // Nearest colour, so browser colour management or edge blending cannot drop a band.
      band = SCALE_RGB.reduce((best, rgb, j) => {
        const d = (rgb[0] - pixels[i]) ** 2 + (rgb[1] - pixels[i + 1]) ** 2 + (rgb[2] - pixels[i + 2]) ** 2
        return d < best.d ? { j, d } : best
      }, { j: -1, d: Infinity }).j
      seen.set(key, band)
    }
    if (band > max) max = band
  }
  return max
}

/** CWA ships a lat/lon-linear image; Leaflet stretches overlays linearly in Mercator, so warp rows first. */
export async function toMercatorImage(map: Pick<RainfallMap, 'image' | 'bounds'>): Promise<{ url: string; maxIndex: number }> {
  const img = new Image()
  img.src = map.image
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  for (let row = 0; row < canvas.height; row++) {
    ctx.drawImage(img, 0, sourceRow(row, canvas.height, map.bounds.north, map.bounds.south), canvas.width, 1, 0, row, canvas.width, 1)
  }
  const maxIndex = maxRainIndex(ctx.getImageData(0, 0, canvas.width, canvas.height).data)
  return { url: canvas.toDataURL('image/png'), maxIndex }
}

export async function fetchRainfallMap(): Promise<RainfallMap> {
  const res = await fetch('/api/cwa/rainfall-map')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
