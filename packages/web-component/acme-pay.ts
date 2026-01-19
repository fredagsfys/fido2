/**
 * ACME Pay Web Component
 * Custom element for payment integration
 *
 * Usage:
 * <acme-pay
 *   amount="999"
 *   currency="BRL"
 *   merchant-id="xxx"
 *   merchant-name="Store Name"
 *   api-base="https://api.acme.com"
 * ></acme-pay>
 */

import type {
  PaymentConfig,
  PaymentResult,
  PaymentError,
  PaymentMethod,
  Currency,
  CartItem,
} from '../core/types';
import { PaymentState } from '../core/payment-state';
import { WebAuthnClient, getCredential, isWebAuthnSupported } from '../core/webauthn-service';
import { BottomSheet } from '../ui/bottom-sheet';
import { BiometricOverlay, withBiometricOverlay } from '../ui/biometric-overlay';
import { PaymentSelector, DEFAULT_PAYMENT_METHODS } from '../ui/payment-selector';

// Import styles for Shadow DOM
import baseStyles from '../styles/base.css?inline';

/**
 * ACME Pay Custom Element
 */
export class AcmePayElement extends HTMLElement {
  private shadow: ShadowRoot;
  private state: PaymentState;
  private webAuthnClient: WebAuthnClient | null = null;
  private bottomSheet: BottomSheet | null = null;
  private biometricOverlay: BiometricOverlay | null = null;
  private paymentSelector: PaymentSelector | null = null;
  private items: CartItem[] = [];

  // Observed attributes
  static get observedAttributes(): string[] {
    return ['amount', 'currency', 'merchant-id', 'merchant-name', 'api-base', 'button-text'];
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.state = new PaymentState();
  }

  /**
   * Component connected to DOM
   */
  connectedCallback(): void {
    this.render();
    this.initializeComponents();
    this.bindEvents();
  }

  /**
   * Component disconnected from DOM
   */
  disconnectedCallback(): void {
    this.cleanup();
  }

  /**
   * Attribute changed callback
   */
  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Get amount attribute
   */
  get amount(): number {
    return parseFloat(this.getAttribute('amount') || '0');
  }

  set amount(value: number) {
    this.setAttribute('amount', value.toString());
  }

  /**
   * Get currency attribute
   */
  get currency(): Currency {
    return (this.getAttribute('currency') as Currency) || 'BRL';
  }

  set currency(value: Currency) {
    this.setAttribute('currency', value);
  }

  /**
   * Get merchant ID attribute
   */
  get merchantId(): string {
    return this.getAttribute('merchant-id') || '';
  }

  set merchantId(value: string) {
    this.setAttribute('merchant-id', value);
  }

  /**
   * Get merchant name attribute
   */
  get merchantName(): string {
    return this.getAttribute('merchant-name') || 'Merchant';
  }

  set merchantName(value: string) {
    this.setAttribute('merchant-name', value);
  }

  /**
   * Get API base URL attribute
   */
  get apiBase(): string {
    return this.getAttribute('api-base') || '';
  }

  set apiBase(value: string) {
    this.setAttribute('api-base', value);
  }

  /**
   * Get button text attribute
   */
  get buttonText(): string {
    return this.getAttribute('button-text') || 'Pay Now';
  }

  set buttonText(value: string) {
    this.setAttribute('button-text', value);
  }

  /**
   * Set cart items
   */
  setItems(items: CartItem[]): void {
    this.items = items;
    this.state.clearCart();
    items.forEach((item) => {
      this.state.addItem(item.name, item.price, item.emoji);
    });
  }

  /**
   * Render component
   */
  private render(): void {
    const formattedAmount = this.state.formatPrice(this.amount);

    this.shadow.innerHTML = `
      <style>${baseStyles}</style>
      <style>
        :host {
          display: block;
        }
        .acme-pay-trigger {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #32BCAD 0%, #00A868 100%);
          color: white;
          border: none;
          border-radius: 24px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          font-family: var(--acme-font-family);
        }
        .acme-pay-trigger:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 168, 104, 0.35);
        }
        .acme-pay-trigger:active {
          transform: scale(0.98);
        }
        .acme-pay-trigger:disabled {
          background: #c7c7cc;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .acme-pay-trigger svg {
          width: 20px;
          height: 20px;
          fill: currentColor;
        }
      </style>
      <button class="acme-pay-trigger">
        <svg viewBox="0 0 24 24">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
        </svg>
        ${this.buttonText} - ${formattedAmount}
      </button>
      <div class="acme-payment-ui"></div>
    `;
  }

  /**
   * Initialize components
   */
  private initializeComponents(): void {
    this.webAuthnClient = new WebAuthnClient(this.apiBase);

    const uiContainer = this.shadow.querySelector('.acme-payment-ui') as HTMLElement;

    // Create bottom sheet
    this.bottomSheet = new BottomSheet({
      onClose: () => this.dispatchEvent(new CustomEvent('payment-cancel')),
    });
    this.bottomSheet.create(uiContainer);

    // Create biometric overlay
    this.biometricOverlay = new BiometricOverlay({
      title: 'Biometric Verification',
      subtitle: 'Touch the sensor or use Face ID',
      hint: 'Secure authentication via FIDO2',
    });
    this.biometricOverlay.create(uiContainer);
  }

  /**
   * Bind events
   */
  private bindEvents(): void {
    const triggerBtn = this.shadow.querySelector('.acme-pay-trigger') as HTMLButtonElement;
    triggerBtn?.addEventListener('click', () => this.openPaymentSheet());
  }

  /**
   * Open payment sheet
   */
  private openPaymentSheet(): void {
    if (!this.bottomSheet) return;

    const content = this.buildPaymentSheetContent();
    this.bottomSheet.setContent(content);

    // Initialize payment selector in shadow DOM
    const selectorContainer = this.shadow.querySelector(
      '.acme-payment-methods-container'
    ) as HTMLElement;
    if (selectorContainer) {
      this.paymentSelector = new PaymentSelector({
        methods: DEFAULT_PAYMENT_METHODS,
        defaultMethod: 'pix',
        onChange: (method) => this.updatePayButton(method),
      });
      this.paymentSelector.create(selectorContainer);
    }

    // Bind pay button
    const payBtn = this.shadow.querySelector('.acme-pay-btn') as HTMLButtonElement;
    payBtn?.addEventListener('click', () => this.handlePayment());

    // Bind close button
    const closeBtn = this.shadow.querySelector('.acme-sheet-close') as HTMLButtonElement;
    closeBtn?.addEventListener('click', () => this.closePaymentSheet());

    this.bottomSheet.open();
  }

  /**
   * Build payment sheet content
   */
  private buildPaymentSheetContent(): string {
    const formattedAmount = this.formatAmountDisplay(this.amount);
    const currencySymbol = this.currency === 'BRL' ? 'R$' : '$';

    const itemsHTML =
      this.items.length > 0
        ? `<div class="acme-order-items">
          ${this.items
            .map(
              (item) => `
            <div class="acme-order-item">
              <span class="acme-order-item-name">${item.emoji || ''} ${item.name}</span>
              <span class="acme-order-item-price">${this.state.formatPrice(item.price)}</span>
            </div>
          `
            )
            .join('')}
        </div>`
        : '';

    return `
      <div class="acme-payment-sheet">
        <div class="acme-sheet-header">
          <button class="acme-sheet-close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#5f6368">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
          <div class="acme-sheet-logo">
            <span class="acme-sheet-logo-text">PIX</span>
            <span class="acme-sheet-logo-sub">by ACME</span>
          </div>
          <div class="acme-sheet-spacer"></div>
        </div>

        <div class="acme-payment-amount">
          <span class="acme-currency">${currencySymbol}</span>
          <span class="acme-amount-value">${formattedAmount}</span>
        </div>

        <div class="acme-merchant-name">${this.merchantName}</div>

        ${itemsHTML}

        <div class="acme-payment-methods-container"></div>

        <button class="acme-pay-btn">
          <span class="acme-spinner"></span>
          <span class="acme-btn-content">Pay with PIX</span>
        </button>

        <div class="acme-sheet-footer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#5f6368">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
          </svg>
          Secured by ACME Pay
        </div>
      </div>
    `;
  }

  /**
   * Format amount for display
   */
  private formatAmountDisplay(amount: number): string {
    return amount.toFixed(2).replace('.', ',');
  }

  /**
   * Update pay button text
   */
  private updatePayButton(method: PaymentMethod): void {
    const btn = this.shadow.querySelector('.acme-pay-btn .acme-btn-content');
    if (btn) {
      switch (method) {
        case 'pix':
          btn.textContent = 'Pay with PIX';
          break;
        case 'card':
          btn.textContent = 'Pay with Card';
          break;
        case 'klarna':
          btn.textContent = 'Pay with Klarna';
          break;
      }
    }
  }

  /**
   * Handle payment
   */
  private async handlePayment(): Promise<void> {
    const method = this.paymentSelector?.getSelected() || 'pix';
    const btn = this.shadow.querySelector('.acme-pay-btn') as HTMLButtonElement;

    btn?.classList.add('loading');
    btn.disabled = true;

    try {
      if (method === 'pix') {
        await this.processPixPayment();
      } else {
        this.dispatchEvent(
          new CustomEvent('payment-error', {
            detail: {
              code: 'NOT_IMPLEMENTED',
              message: `${method} payment not implemented`,
            },
          })
        );
      }
    } finally {
      btn?.classList.remove('loading');
      btn.disabled = false;
    }
  }

  /**
   * Process PIX payment with WebAuthn
   */
  private async processPixPayment(): Promise<void> {
    if (!isWebAuthnSupported()) {
      this.dispatchEvent(
        new CustomEvent('payment-error', {
          detail: { code: 'WEBAUTHN_NOT_SUPPORTED', message: 'WebAuthn is not supported' },
        })
      );
      return;
    }

    const username = 'fredagsfys';

    try {
      if (!this.webAuthnClient) {
        throw new Error('WebAuthn client not initialized');
      }

      const options = await this.webAuthnClient.loginStart(username);

      if (!this.biometricOverlay) {
        throw new Error('Biometric overlay not initialized');
      }

      const credential = await withBiometricOverlay(this.biometricOverlay, () =>
        getCredential(options)
      );

      await this.webAuthnClient.loginFinish(username, credential);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const result: PaymentResult = {
        success: true,
        transactionId: `txn_${Date.now()}`,
        amount: this.amount,
        currency: this.currency,
        method: 'pix',
        timestamp: new Date(),
        items: this.items,
      };

      this.closePaymentSheet();
      this.dispatchEvent(new CustomEvent('payment-success', { detail: result }));
    } catch (error) {
      const err = error as Error;
      this.dispatchEvent(
        new CustomEvent('payment-error', {
          detail: {
            code: err.name === 'NotAllowedError' ? 'AUTH_CANCELLED' : 'PAYMENT_FAILED',
            message: err.message,
          },
        })
      );
    }
  }

  /**
   * Close payment sheet
   */
  private closePaymentSheet(): void {
    this.bottomSheet?.close();
  }

  /**
   * Cleanup
   */
  private cleanup(): void {
    this.bottomSheet?.destroy();
    this.biometricOverlay?.destroy();
    this.paymentSelector?.destroy();
  }
}

// Register custom element
if (typeof customElements !== 'undefined') {
  customElements.define('acme-pay', AcmePayElement);
}

export default AcmePayElement;
