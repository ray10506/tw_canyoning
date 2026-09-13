import { ref } from 'vue'

/** Drag-to-resize a panel/sidebar width from a mousedown handler.
 *  `rawWidth` maps the mousemove event to an unclamped width; result is clamped to [min, max]. */
export function useResizableWidth(
  initial: number,
  rawWidth: (e: MouseEvent) => number,
  min: number,
  max: number | (() => number),
) {
  const width = ref(initial)
  const isResizing = ref(false)

  function start(e: MouseEvent) {
    e.preventDefault()
    isResizing.value = true
    const onMove = (ev: MouseEvent) => {
      const hi = typeof max === 'function' ? max() : max
      width.value = Math.min(Math.max(rawWidth(ev), min), hi)
    }
    const onUp = () => {
      isResizing.value = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return { width, isResizing, start }
}
