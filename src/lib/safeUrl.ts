/** Route data feeds hrefs; only web links and same-site paths pass — never `javascript:` or `data:`. */
export function safeUrl(url: unknown): string | undefined {
  return typeof url === 'string' && /^(https?:\/\/|\/(?!\/))/i.test(url.trim()) ? url : undefined
}
