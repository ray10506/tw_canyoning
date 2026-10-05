import { onMounted, onUnmounted, type Ref } from 'vue'

/**
 * Calls `onTap` for a tap outside `el` (and outside anything matching `ignore`).
 * Replaces full-screen backdrops, which swallow map pans, pinches and wheel zoom (Map Stays Present).
 * A drag or pinch moves the pointer more than a few px, so it never counts as a tap.
 */
export function useTapOutside(el: Ref<HTMLElement | null>, ignore: string, onTap: () => void) {
  let down: { x: number; y: number } | null = null
  const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY } }
  const onUp = (e: PointerEvent) => {
    const start = down
    down = null
    if (!el.value || !start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) return
    const target = e.target as Element | null
    if (el.value.contains(target) || target?.closest(ignore)) return
    onTap()
  }
  onMounted(() => {
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointerup', onUp, true)
  })
  onUnmounted(() => {
    document.removeEventListener('pointerdown', onDown, true)
    document.removeEventListener('pointerup', onUp, true)
  })
}
