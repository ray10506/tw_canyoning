import rawStations from '../data/rainfall-stations.json'

export interface RainfallStation {
  station_id: string
  name: string
  county: string
  town: string
  lat: number
  lon: number
  altitude: number
}

export const rainfallStations: RainfallStation[] = rawStations
