export interface ChartSeries {
  label: string
  color: string
  points: { time: string; value: number | null }[]
  dashed?: boolean
}
