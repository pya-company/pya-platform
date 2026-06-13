// @undeadliner/pya-i18n — extraction target. Phase 5 brings the full getT helper from
// pyaeats-app/apps/site/src/i18n/dict.ts. For now we expose only the public
// Locale type so downstream packages can compile against the future shape.

export type Locale = 'es' | 'en'

export interface Dict {
  readonly [key: string]: string | Dict
}

export const isLocale = (s: string): s is Locale => s === 'es' || s === 'en'
