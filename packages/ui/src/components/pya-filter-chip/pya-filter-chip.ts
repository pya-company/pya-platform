import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

/** Multi-select filter chip. `<button aria-pressed>` pattern (per ARIA APG). */
@customElement('pya-filter-chip')
export class PyaFilterChip extends LitElement {
  protected override createRenderRoot(): HTMLElement { return this }

  @property({ type: Boolean, reflect: true }) pressed = false
  @property({ type: String }) readonly label = ''
  @property({ type: String }) readonly icon = ''

  protected override render() {
    return html`
      <button
        type="button"
        class="pya-chip"
        aria-pressed=${String(this.pressed)}
        @click=${this.toggle}>
        ${this.icon !== '' ? html`<span aria-hidden="true">${this.icon}</span>` : ''} ${this.label}
      </button>
    `
  }

  private readonly toggle = (): void => {
    this.pressed = !this.pressed
    this.dispatchEvent(new CustomEvent('chip-toggle', {
      detail: { pressed: this.pressed, label: this.label },
      bubbles: true, composed: true,
    }))
  }
}

declare global {
  interface HTMLElementTagNameMap { 'pya-filter-chip': PyaFilterChip }
}
