<template>
  <div class="chart-wrap">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Chart, registerables, Tooltip } from 'chart.js'
import type { ChartType, TooltipPositionerFunction } from 'chart.js'
import type { ChartSeries } from '../lib/chart'

Chart.register(...registerables)

declare module 'chart.js' {
  interface TooltipPositionerMap {
    primaryPoint: TooltipPositionerFunction<ChartType>
  }
}

// Anchors the tooltip to the primary (water level) series point so it tracks that line on hover.
Tooltip.positioners.primaryPoint = (items) => {
  const item = items.find(i => i.datasetIndex === 0) ?? items[0]
  if (!item) return false
  return { x: item.element.x, y: item.element.y }
}

const props = defineProps<{
  series: ChartSeries[]
  yLabel?: string
  y1Label?: string
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

function formatLabel(iso: string) {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`
}

function formatTooltipTitle(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`
}

function computeYRange(series: ChartSeries[]) {
  const primary = series.find(s => !s.dashed) ?? series[0]
  let dataMin = Infinity
  let dataMax = -Infinity
  for (const p of primary?.points ?? []) {
    if (p.value == null) continue
    if (p.value < dataMin) dataMin = p.value
    if (p.value > dataMax) dataMax = p.value
  }
  if (!isFinite(dataMin) || !isFinite(dataMax)) return {}
  const range = dataMax - dataMin
  const padding = range > 0 ? range * 0.1 : (Math.abs(dataMax) * 0.1 || 0.1)
  return { min: dataMin - padding, max: dataMax + padding }
}

function buildConfig() {
  const labels = props.series[0]?.points.map(p => formatLabel(p.time)) ?? []
  const usesY1 = props.series.some(s => s.yAxisID === 'y1')

  return {
    type: 'line' as const,
    data: {
      labels,
      datasets: props.series.map(s => ({
        label: s.label,
        data: s.points.map(p => p.value),
        borderColor: s.color,
        backgroundColor: s.color,
        yAxisID: s.yAxisID ?? 'y',
        borderDash: s.dashed ? [5, 5] : undefined,
        pointRadius: 0,
        pointHitRadius: s.dashed ? 0 : 15,
        pointHoverRadius: s.dashed ? 0 : 4,
        borderWidth: s.dashed ? 1 : 2,
        spanGaps: true,
        tension: 0.2,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: true, axis: 'x' as const },
      plugins: {
        legend: { labels: { color: '#ccc', font: { size: 11 }, boxWidth: 16 } },
        tooltip: {
          position: 'primaryPoint' as const,
          callbacks: {
            title: (items: { dataIndex: number }[]) => {
              const point = props.series[0]?.points[items[0]?.dataIndex]
              return point ? formatTooltipTitle(point.time) : ''
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#888', maxTicksLimit: 8, autoSkip: true, font: { size: 10 } },
          grid: { color: '#2a2a4a' },
        },
        y: {
          type: 'linear' as const,
          position: 'left' as const,
          ...computeYRange(props.series),
          title: { display: !!props.yLabel, text: props.yLabel, color: '#ccc' },
          ticks: { color: '#888', font: { size: 10 } },
          grid: { color: '#2a2a4a' },
        },
        ...(usesY1 ? {
          y1: {
            type: 'linear' as const,
            position: 'right' as const,
            title: { display: !!props.y1Label, text: props.y1Label, color: '#ccc' },
            ticks: { color: '#888', font: { size: 10 } },
            grid: { drawOnChartArea: false },
          },
        } : {}),
      },
    },
  }
}

function render() {
  chart?.destroy()
  if (!canvasRef.value) return
  chart = new Chart(canvasRef.value, buildConfig() as any)
}

onMounted(render)
watch(() => props.series, render, { deep: true })
onUnmounted(() => chart?.destroy())
</script>

<style scoped>
.chart-wrap {
  position: relative;
  width: 100%;
  height: 50vh;
  min-height: 320px;
  max-height: 480px;
}
</style>
