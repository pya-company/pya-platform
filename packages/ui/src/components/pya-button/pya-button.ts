import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { LOCATORS } from './pya-button.locators.ts'

/**
 * Accessible button primitive. Light DOM (a11y tree integrity, global token
 * cascade). AAA: target ≥44px, 3px focus ring with 7:1 contrast, motion via
 * --pya-motion-* tokens (auto-collapses under prefers-reduced-motion).
 */
@customElement('pya-button')
export class PyaButton extends LitElement {
  protected override createRenderRoot(): HTMLElement {
    return this
  }

  @property({ type: String, reflect: true }) readonly variant: 'primary' | 'ghost' | 'danger' =
    'primary'

  @property({ type: String, reflect: true }) readonly size: 'sm' | 'md' | 'lg' = 'md'

  @property({ type: Boolean, reflect: true }) readonly disabled = false

  @property({ type: String, reflect: true }) readonly type: 'button' | 'submit' | 'reset' = 'button'

  @property({ type: String }) readonly label = ''

  static override styles = css`
    /* light DOM — styles emitted via adoptedStyleSheets are still scoped. */
  `

  protected override render() {
    return html`
      <button
        type=${this.type}
        class=${`pya-button pya-button--${this.variant} pya-button--${this.size}`}
        ?disabled=${this.disabled}
        data-testid=${LOCATORS.root}
        aria-label=${this.label || ''}
        @click=${this.handleClick}
      >
        <slot></slot>
      </button>
    `
  }

  private readonly handleClick = (event: MouseEvent): void => {
    if (this.disabled) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pya-button': PyaButton
  }
}
