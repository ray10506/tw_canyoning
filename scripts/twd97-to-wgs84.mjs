// Convert TWD97 TM2 (EPSG:3826, central meridian 121°E) coordinates to WGS84 lat/lon.
// Standard inverse Transverse Mercator formula (Snyder), GRS80 ellipsoid.
const a = 6378137
const f = 1 / 298.257222101
const e2 = f * (2 - f)
const e2p = e2 / (1 - e2)
const k0 = 0.9999
const lon0 = (121 * Math.PI) / 180
const FE = 250000
const FN = 0

export function twd97ToWgs84(x, y) {
  const M = (y - FN) / k0
  const mu = M / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256))
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2))

  const phi1 = mu
    + ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu)
    + ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu)
    + ((151 * e1 ** 3) / 96) * Math.sin(6 * mu)
    + ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu)

  const sinPhi1 = Math.sin(phi1)
  const cosPhi1 = Math.cos(phi1)
  const tanPhi1 = Math.tan(phi1)

  const C1 = e2p * cosPhi1 ** 2
  const T1 = tanPhi1 ** 2
  const N1 = a / Math.sqrt(1 - e2 * sinPhi1 ** 2)
  const R1 = (a * (1 - e2)) / (1 - e2 * sinPhi1 ** 2) ** 1.5
  const D = (x - FE) / (N1 * k0)

  const lat = phi1 - (N1 * tanPhi1 / R1) * (
    D ** 2 / 2
    - ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * e2p) * D ** 4) / 24
    + ((61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * e2p - 3 * C1 ** 2) * D ** 6) / 720
  )

  const lon = lon0 + (
    D
    - ((1 + 2 * T1 + C1) * D ** 3) / 6
    + ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * e2p + 24 * T1 ** 2) * D ** 5) / 120
  ) / cosPhi1

  return { lat: (lat * 180) / Math.PI, lon: (lon * 180) / Math.PI }
}
