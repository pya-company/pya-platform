/**
 * Singleton accessible announcer. Owns two ARIA live regions in <body> (polite
 * and assertive). Lit components call `announcer.announce(msg)` instead of
 * creating their own live regions (which screen readers may not pick up if
 * injected dynamically).
 */
const ensureRegion = (priority: 'polite' | 'assertive'): HTMLElement => {
  const id = `pya-live-${priority}`
  const existing = document.getElementById(id)
  if (existing !== null) return existing
  const el = document.createElement('div')
  el.id = id
  el.setAttribute('role', priority === 'polite' ? 'status' : 'alert')
  el.setAttribute('aria-live', priority)
  el.setAttribute('aria-atomic', 'true')
  el.className = 'visually-hidden'
  document.body.appendChild(el)
  return el
}

export const announcer = {
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const region = ensureRegion(priority)
    region.textContent = ''
    requestAnimationFrame(() => {
      region.textContent = message
    })
  },
}
