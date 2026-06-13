/** Pure UI helper for Guaraní formatting. Lit components import this rather
 *  than reaching into @undeadliner/pya-shared for tree-shaking on islands.
 *  Locale read from <html lang> — Lit islands don't have framework context. */
const isEnLocale = (): boolean =>
  typeof document !== 'undefined' && document.documentElement.lang.startsWith('en')

export const formatGs = (n: number): string => {
  if (n === 0) return isEnLocale() ? 'Free' : 'Gratis'
  return `Gs. ${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

export const formatGsSpoken = (n: number): string => {
  if (n === 0) return isEnLocale() ? 'free' : 'gratis'
  const tag = isEnLocale() ? 'en-US' : 'es-PY'
  const word = isEnLocale() ? 'guaraníes' : 'guaraníes'
  return `${n.toLocaleString(tag)} ${word}`
}
