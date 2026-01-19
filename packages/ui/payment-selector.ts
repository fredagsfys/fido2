/**
 * Payment Selector UI Component
 * Payment method selection UI
 */

import type { PaymentMethod, PaymentMethodOption } from '../core/types';

export interface PaymentSelectorConfig {
  methods: PaymentMethodOption[];
  defaultMethod?: PaymentMethod;
  onChange?: (method: PaymentMethod) => void;
}

export class PaymentSelector {
  private container: HTMLElement | null = null;
  private config: PaymentSelectorConfig;
  private selectedMethod: PaymentMethod;

  constructor(config: PaymentSelectorConfig) {
    this.config = config;
    this.selectedMethod = config.defaultMethod || config.methods[0]?.id || 'pix';
  }

  /**
   * Initialize with existing DOM element
   */
  init(containerElement: HTMLElement): void {
    this.container = containerElement;
    this.bindEvents();
  }

  /**
   * Create and inject selector HTML
   */
  create(container: HTMLElement): void {
    const html = this.getHTML();
    container.insertAdjacentHTML('beforeend', html);
    this.container = container.querySelector('.acme-payment-methods');
    this.bindEvents();
  }

  /**
   * Get payment method icon SVG
   */
  private getMethodIcon(method: PaymentMethodOption): string {
    switch (method.id) {
      case 'pix':
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z"/>
        </svg>`;
      case 'card':
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
        </svg>`;
      case 'klarna':
        return `<span class="acme-klarna-logo">K</span>`;
      default:
        return method.icon || '';
    }
  }

  /**
   * Get selector HTML template
   */
  getHTML(): string {
    const methodsHTML = this.config.methods
      .map((method) => {
        const isSelected = method.id === this.selectedMethod;
        const isPrimary = method.isPrimary;
        const classes = [
          'acme-payment-method',
          isSelected ? 'selected' : '',
          isPrimary ? 'primary' : '',
        ]
          .filter(Boolean)
          .join(' ');

        const balanceHTML = method.balance
          ? `<div class="acme-payment-method-balance-inline">
              <span class="acme-balance-dot"></span>
              <span class="acme-balance-text">R$ ${this.formatBalance(method.balance)} available</span>
            </div>`
          : '';

        const badgeHTML = method.badge
          ? `<span class="acme-payment-method-badge">${method.badge}</span>`
          : '';

        return `
          <div class="${classes}" data-method="${method.id}">
            <div class="acme-payment-method-icon ${method.id}">
              ${this.getMethodIcon(method)}
            </div>
            <div class="acme-payment-method-info">
              <div class="acme-payment-method-name">${method.name}${badgeHTML}</div>
              <div class="acme-payment-method-detail">${method.detail}</div>
              ${balanceHTML}
            </div>
            <div class="acme-payment-method-radio">
              <div class="acme-payment-method-radio-inner"></div>
            </div>
          </div>
        `;
      })
      .join('');

    // Add divider between primary and other methods
    const primaryIndex = this.config.methods.findIndex((m) => m.isPrimary);
    const hasPrimaryAndOthers =
      primaryIndex !== -1 && this.config.methods.length > 1;

    let finalHTML = methodsHTML;
    if (hasPrimaryAndOthers) {
      const parts = methodsHTML.split(
        `</div>
          <div class="acme-payment-method"`
      );
      if (parts.length > 1) {
        finalHTML =
          parts[0] +
          `</div>
          <div class="acme-other-methods-divider">
            <span>or pay with</span>
          </div>
          <div class="acme-payment-method"` +
          parts.slice(1).join(`</div>
          <div class="acme-payment-method"`);
      }
    }

    return `
      <div class="acme-payment-methods">
        ${finalHTML}
      </div>
    `;
  }

  /**
   * Format balance for display
   */
  private formatBalance(value: number): string {
    return value.toFixed(2).replace('.', ',');
  }

  /**
   * Bind click events
   */
  private bindEvents(): void {
    if (!this.container) return;

    const methods = this.container.querySelectorAll('.acme-payment-method');
    methods.forEach((method) => {
      method.addEventListener('click', () => {
        const methodId = method.getAttribute('data-method') as PaymentMethod;
        this.select(methodId);
      });
    });
  }

  /**
   * Select a payment method
   */
  select(method: PaymentMethod): void {
    if (!this.container) return;

    this.selectedMethod = method;

    // Update UI
    const methods = this.container.querySelectorAll('.acme-payment-method');
    methods.forEach((el) => {
      if (el.getAttribute('data-method') === method) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });

    // Trigger callback
    this.config.onChange?.(method);
  }

  /**
   * Get currently selected method
   */
  getSelected(): PaymentMethod {
    return this.selectedMethod;
  }

  /**
   * Get button text for selected method
   */
  getButtonText(): string {
    const method = this.config.methods.find((m) => m.id === this.selectedMethod);
    if (!method) return 'Pay';

    switch (this.selectedMethod) {
      case 'pix':
        return 'Pay with PIX';
      case 'card':
        return 'Pay with Card';
      case 'klarna':
        return 'Pay with Klarna';
      default:
        return `Pay with ${method.name}`;
    }
  }

  /**
   * Update available methods
   */
  setMethods(methods: PaymentMethodOption[]): void {
    this.config.methods = methods;
    if (this.container) {
      const parent = this.container.parentElement;
      this.container.remove();
      if (parent) {
        this.create(parent);
      }
    }
  }

  /**
   * Destroy the selector
   */
  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}

/**
 * Default payment methods configuration
 */
export const DEFAULT_PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'pix',
    name: 'PIX by ACME',
    detail: 'Banco ACME **** 4521',
    icon: 'pix',
    badge: 'Instant',
    balance: 2847.5,
    isPrimary: true,
  },
  {
    id: 'card',
    name: 'Credit or Debit Card',
    detail: 'Add a new card',
    icon: 'card',
  },
  {
    id: 'klarna',
    name: 'Klarna',
    detail: 'Pay in 4 interest-free payments',
    icon: 'klarna',
  },
];
