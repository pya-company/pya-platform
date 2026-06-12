import { LitElement, html, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { cartStore } from '../../controllers/cart-store.ts'

/** Live cart badge — subscribes to cartStore and announces changes. */
@customElement('pya-cart-badge')
export class PyaCartBadge extends LitElement {
  protected override createRenderRoot(): HTMLElement {
    return this
  }

  @state() private count = 0

  private unsub?: () => void

  override connectedCallback(): void {
    super.connectedCallback()
    this.count = cartStore.count()
    this.unsub = cartStore.subscribe((state) => {
      this.count = state.lines.reduce((s, l) => s + l.qty, 0)
    })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unsub?.()
  }

  protected override render() {
    if (this.count === 0) return nothing
    return html`<span class="pya-cart-badge" aria-label=${`${this.count} artículo${this.count === 1 ? '' : 's'} en el carrito`}>${this.count}</span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pya-cart-badge': PyaCartBadge
  }
}
