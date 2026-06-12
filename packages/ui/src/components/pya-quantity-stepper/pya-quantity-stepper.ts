import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { announcer } from '../../controllers/announcer.ts'

/** Accessible quantity stepper. Form-associated via ElementInternals. */
@customElement('pya-quantity-stepper')
export class PyaQuantityStepper extends LitElement {
  static formAssociated = true
  private readonly internals = this.attachInternals()

  protected override createRenderRoot(): HTMLElement {
    return this
  }

  @property({ type: Number }) value = 1
  @property({ type: Number, attribute: 'min' }) readonly min = 1
  @property({ type: Number, attribute: 'max' }) readonly max = 99
  @property({ type: String }) readonly label = 'Cantidad'

  override connectedCallback(): void {
    super.connectedCallback()
    this.internals.setFormValue(String(this.value))
  }

  protected override render() {
    return html`
      <div class="pya-stepper" role="group" aria-labelledby=${`stepper-label-${this.label}`}>
        <span id=${`stepper-label-${this.label}`} class="visually-hidden">${this.label}</span>
        <button type="button" class="pya-stepper__btn"
                aria-label="Quitar uno"
                ?disabled=${this.value <= this.min}
                @click=${this.dec}>−</button>
        <output class="pya-stepper__value" aria-live="polite">${this.value}</output>
        <button type="button" class="pya-stepper__btn"
                aria-label="Agregar uno"
                ?disabled=${this.value >= this.max}
                @click=${this.inc}>+</button>
      </div>
    `
  }

  private readonly inc = (): void => {
    if (this.value >= this.max) return
    this.value = this.value + 1
    this.internals.setFormValue(String(this.value))
    this.dispatchEvent(new CustomEvent('change', { detail: { value: this.value }, bubbles: true }))
    announcer.announce(`Cantidad: ${this.value}`)
  }

  private readonly dec = (): void => {
    if (this.value <= this.min) return
    this.value = this.value - 1
    this.internals.setFormValue(String(this.value))
    this.dispatchEvent(new CustomEvent('change', { detail: { value: this.value }, bubbles: true }))
    announcer.announce(`Cantidad: ${this.value}`)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pya-quantity-stepper': PyaQuantityStepper
  }
}
