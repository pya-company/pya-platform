/**
 * Cart store — client-side, localStorage-backed, pub/sub.
 * Used by `<pya-cart-badge>`, `<pya-cart-drawer>`, and checkout page.
 */
const KEY = 'pya.cart'

export interface CartLine {
  readonly itemId: string
  readonly name: string
  readonly priceGs: number
  readonly emoji?: string
  readonly qty: number
}

export interface CartState {
  readonly storeId?: string
  readonly storeName?: string
  readonly lines: ReadonlyArray<CartLine>
}

type Listener = (state: CartState) => void

const isLine = (v: unknown): v is CartLine =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as { itemId?: unknown }).itemId === 'string' &&
  typeof (v as { name?: unknown }).name === 'string' &&
  typeof (v as { priceGs?: unknown }).priceGs === 'number' &&
  typeof (v as { qty?: unknown }).qty === 'number'

const read = (): CartState => {
  try {
    const raw = globalThis.localStorage?.getItem(KEY)
    if (raw === null || raw === undefined) return { lines: [] }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return { lines: [] }
    const obj = parsed as { storeId?: unknown; storeName?: unknown; lines?: unknown }
    const lines = Array.isArray(obj.lines) ? obj.lines.filter(isLine) : []
    const partial: CartState = { lines }
    return typeof obj.storeId === 'string' && typeof obj.storeName === 'string'
      ? { storeId: obj.storeId, storeName: obj.storeName, lines }
      : partial
  } catch {
    return { lines: [] }
  }
}

const listeners = new Set<Listener>()

const write = (state: CartState): void => {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(state))
  } catch {
    /* quota / SSR */
  }
  for (const l of listeners) l(state)
}

export const cartStore = {
  read,
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  add(storeId: string, storeName: string, item: Omit<CartLine, 'qty'>, qty = 1): void {
    const state = read()
    if (state.storeId !== undefined && state.storeId !== storeId) {
      // Single-store cart for MVP — replace if different store.
      write({ storeId, storeName, lines: [{ ...item, qty }] })
      return
    }
    const existing = state.lines.find((l) => l.itemId === item.itemId)
    const lines = existing
      ? state.lines.map((l) => (l.itemId === item.itemId ? { ...l, qty: l.qty + qty } : l))
      : [...state.lines, { ...item, qty }]
    write({ storeId, storeName, lines })
  },
  setQty(itemId: string, qty: number): void {
    const state = read()
    const lines = state.lines
      .map((l) => (l.itemId === itemId ? { ...l, qty } : l))
      .filter((l) => l.qty > 0)
    write(lines.length === 0 ? { lines: [] } : { ...state, lines })
  },
  remove(itemId: string): void {
    const state = read()
    const lines = state.lines.filter((l) => l.itemId !== itemId)
    write(lines.length === 0 ? { lines: [] } : { ...state, lines })
  },
  clear(): void {
    write({ lines: [] })
  },
  count(): number {
    return read().lines.reduce((s, l) => s + l.qty, 0)
  },
  subtotal(): number {
    return read().lines.reduce((s, l) => s + l.priceGs * l.qty, 0)
  },
}
