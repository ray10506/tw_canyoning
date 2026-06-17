export interface ChartSeries {
  label: string
  color: string
  points: { time: string; value: number | null }[]
  yAxisID?: 'y' | 'y1'
  dashed?: boolean
}
