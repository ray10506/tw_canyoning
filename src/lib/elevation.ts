/** In-memory cache so the same GPS coord isn't fetched twice per session. */
const CACHE = new Map<string, number>()

/**
 * Fetch elevation (metres, SRTM 30m) for a single coordinate.
 * Stores in CACHE; returns null on any error or rate-limit.
 */
export async function fetchElevation(lat: number, lon: number): Promise<number | null> {
  const key = `${lat.toFixed(5)},${lon.toFixed(5)}`
  if (CACHE.has(key)) return CACHE.get(key)!
  try {
    const res = await fetch(
      `https://api.opentopodata.org/v1/srtm30m?locations=${lat},${lon}`,
      { signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) return null
    const data = await res.json()
    const ele = data?.results?.[0]?.elevation
    if (typeof ele !== 'number') return null
    const rounded = Math.round(ele)
    CACHE.set(key, rounded)
    return rounded
  } catch {
    return null
  }
}
