export type RouteType = '溯溪' | '溪降' | '野溪溫泉'

export interface Canyon {
  id: string
  name: string
  location: string
  coordinates: [number, number]  // [lat, lng]
  difficulty: 1 | 2 | 3 | 4 | 5
  season: string[]
  description: string
  type: RouteType
  image?: string
}
