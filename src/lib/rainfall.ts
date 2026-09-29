import rawStations from '../data/rainfall-stations.json'
import rawNzStations from '../data/nz-rainfall-stations.json'

export interface RainfallStation {
  station_id: string
  name: string
  county: string
  town: string
  lat: number
  lon: number
  altitude: number
  source?: 'cwa' | 'wcrc'
}

export const rainfallStations: RainfallStation[] = rawStations

// Current NZ coverage: stations near existing South Island routes.
export const nzRainfallStations = rawNzStations as RainfallStation[]
