import rawStations from '../data/rainfall-stations.json'

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

// Only stations near existing South Island routes. Keep these separate so the
// Taiwan hydrology browser stays Taiwan-only.
export const nzRainfallStations: RainfallStation[] = [
  { station_id: 'Arthurs Pass EWS', name: 'Arthurs Pass EWS (ESNZ)', county: 'NZ · ', town: 'Arthur’s Pass', lat: -42.941389, lon: 171.562778, altitude: 0, source: 'wcrc' },
  { station_id: 'Cropp Rv @ Waterfall', name: 'Cropp Rv at Waterfall (ESNZ)', county: 'NZ · ', town: 'Westland', lat: -43.076111, lon: 170.946667, altitude: 0, source: 'wcrc' },
  { station_id: 'Haast Rv @ Moa Ck', name: 'Haast Rv at Moa Ck (ESNZ)', county: 'NZ · ', town: 'Haast', lat: -43.995278, lon: 169.403333, altitude: 0, source: 'wcrc' },
  { station_id: 'Haast Rv @ Roaring Billy', name: 'Haast Rv at Roaring Billy (ESNZ)', county: 'NZ · ', town: 'Haast', lat: -43.9425, lon: 169.298056, altitude: 0, source: 'wcrc' },
  { station_id: 'Ivory Rv @ Ripplerock', name: 'Ivory Rv at Ripplerock (ESNZ)', county: 'NZ · ', town: 'Waitaha', lat: -43.134444, lon: 170.912222, altitude: 0, source: 'wcrc' },
  { station_id: 'Tuke Rv @ Tuke Hut', name: 'Tuke Rv at Tuke Hut (ESNZ)', county: 'NZ · ', town: 'Westland', lat: -43.088889, lon: 170.889167, altitude: 0, source: 'wcrc' },
  { station_id: 'Waiho Rv @ Douglas Hut', name: 'Waiho Rv at Douglas Hut (ESNZ)', county: 'NZ · ', town: 'Westland', lat: -43.422778, lon: 170.17, altitude: 0, source: 'wcrc' },
]
