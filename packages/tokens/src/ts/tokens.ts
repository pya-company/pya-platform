/**
 * JS-consumable mirror of the design tokens. Values are CSS `var()` strings so
 * they resolve at use time (theme + palette aware). For static values use the
 * generator in `scripts/generate-ts.ts` to refresh this file from CSS.
 *
 * NEVER use `as const` outside this file — see CODE_STYLE.md.
 */
export const PYA_TOKENS = {
  color: {
    text: 'var(--pya-text)',
    textMuted: 'var(--pya-text-muted)',
    surface: 'var(--pya-surface)',
    acc: 'var(--pya-acc)',
    acc2: 'var(--pya-acc2)',
    glassBg: 'var(--pya-glass-bg)',
    glassBorder: 'var(--pya-glass-border)',
    focusRing: 'var(--pya-focus-ring-color)',
  },
  motion: {
    instant: 'var(--pya-motion-instant)',
    fast: 'var(--pya-motion-fast)',
    normal: 'var(--pya-motion-normal)',
    slow: 'var(--pya-motion-slow)',
    page: 'var(--pya-motion-page)',
    easeStandard: 'var(--pya-ease-standard)',
    easeDecelerate: 'var(--pya-ease-decelerate)',
    easeAccelerate: 'var(--pya-ease-accelerate)',
  },
  shape: {
    radiusSm: 'var(--pya-radius-sm)',
    radiusMd: 'var(--pya-radius-md)',
    radiusLg: 'var(--pya-radius-lg)',
    radiusPill: 'var(--pya-radius-pill)',
  },
  space: {
    s1: 'var(--pya-space-1)',
    s2: 'var(--pya-space-2)',
    s3: 'var(--pya-space-3)',
    s4: 'var(--pya-space-4)',
    s5: 'var(--pya-space-5)',
    s6: 'var(--pya-space-6)',
    s7: 'var(--pya-space-7)',
    s8: 'var(--pya-space-8)',
  },
  target: {
    min: 'var(--pya-target-min)',
    comfortable: 'var(--pya-target-comfortable)',
  },
} as const

export type PyaToken = typeof PYA_TOKENS
