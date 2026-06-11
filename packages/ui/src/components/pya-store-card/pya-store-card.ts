import { LitElement, html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { LOCATORS } from './pya-store-card.locators.ts'

/** Photo-forward store card. Light DOM for a11y tree integrity. */
@customElement('pya-store-card')
export class PyaStoreCard extends LitElement {
  protected override createRenderRoot(): HTMLElement { return this }

  @property({ type: String, reflect: true }) readonly slug = ''
  @property({ type: String }) readonly name = ''
  @property({ type: String }) readonly cuisineLabel = ''
  @property({ type: String }) readonly emoji = ''
  @property({ type: String }) readonly thumb = 'burger'
  @property({ type: Number }) readonly etaMin = 0
  @property({ type: Number }) readonly etaMax = 0
  @property({ type: Number }) readonly rating = 0
  @property({ type: String }) readonly promo = ''
  @property({ type: Boolean }) readonly express = false
  @property({ type: Boolean }) readonly freeShipping = false
  @property({ type: String }) readonly href = ''

  protected override render() {
    const ariaLabel = `${this.name}, ${this.cuisineLabel}, ${this.etaMin} a ${this.etaMax} minutos, calificación ${this.rating}`
    // Per-slug VT names — matched by .store-cover on the detail page so the
    // photo morphs into the hero cover during cross-document view-transition.
    const cardVtName = `card-${this.slug}`
    const photoVtName = `card-photo-${this.slug}`
    return html`
      <a class="pya-card" href=${this.href} data-testid=${LOCATORS.root} aria-label=${ariaLabel}
         style=${`view-transition-name: ${cardVtName}`}>
        <div class=${`pya-card__photo pya-thumb--${this.thumb}`} aria-hidden="true"
             style=${`view-transition-name: ${photoVtName}`}>
          <span class="pya-card__emoji">${this.emoji}</span>
          ${this.promo !== '' ? html`<span class="pya-card__tag">${this.promo}</span>` : nothing}
        </div>
        <div class="pya-card__body">
          <div class="pya-card__row">
            <h3 class="pya-card__name" data-testid=${LOCATORS.name}>${this.name}</h3>
            <span class="pya-card__rating" data-testid=${LOCATORS.rating}>★ ${this.rating}</span>
          </div>
          <p class="pya-card__meta">
            ${this.cuisineLabel} · <span data-testid=${LOCATORS.eta}>${this.etaMin}–${this.etaMax} min</span>
          </p>
          <div class="pya-card__tags">
            ${this.express ? html`<span class="pya-minitag">⚡ Express</span>` : nothing}
            ${this.freeShipping ? html`<span class="pya-minitag">🛵 Gratis</span>` : nothing}
          </div>
        </div>
      </a>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap { 'pya-store-card': PyaStoreCard }
}
