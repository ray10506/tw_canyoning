/** Returns CSS class for a V-grade token like "V3". Empty string → no class. */
export function vGradeClass(token: string): string {
  const n = parseInt(token?.match(/V(\d+)/)?.[1] ?? '0')
  return ['', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6'][Math.min(n, 6)] ?? 'v6'
}
