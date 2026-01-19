/**
 * ACME Payment SDK
 * Main entry point for the JavaScript SDK
 *
 * Usage:
 * <script src="https://pay.acme.com/sdk.js"></script>
 * <script>
 *   ACME.pay({ amount: 999, currency: 'BRL', onSuccess: (result) => console.log(result) });
 * </script>
 */

import type {
  PaymentConfig,
  PaymentResult,
  PaymentError,
  PaymentMethod,
  SDKConfig,
  PaymentEventType,
  PaymentEventListener,
} from '../core/types';
import { PaymentState } from '../core/payment-state';
import { WebAuthnClient, getCredential, isWebAuthnSupported } from '../core/webauthn-service';
import { BottomSheet } from '../ui/bottom-sheet';
import { BiometricOverlay, withBiometricOverlay } from '../ui/biometric-overlay';
import { PaymentSelector, DEFAULT_PAYMENT_METHODS } from '../ui/payment-selector';

// Styles will be injected at build time or loaded separately
import baseStyles from '../styles/base.css?inline';

/**
 * ACME Payment SDK Class
 */
export class ACME {
  private static instance: ACME | null = null;
  private config: SDKConfig;
  private state: PaymentState;
  private webAuthnClient: WebAuthnClient;
  private bottomSheet: BottomSheet | null = null;
  private biometricOverlay: BiometricOverlay | null = null;
  private paymentSelector: PaymentSelector | null = null;
  private stylesInjected = false;
  private currentPaymentConfig: PaymentConfig | null = null;

  private constructor(config: SDKConfig) {
    this.config = {
      defaultCurrency: 'BRL',
      defaultPaymentMethod: 'pix',
      ...config,
    };
    this.state = new PaymentState();
    this.webAuthnClient = new WebAuthnClient(config.apiBase);

    if (this.config.defaultCurrency) {
      this.state.setCurrency(this.config.defaultCurrency);
    }
  }

  /**
   * Initialize the SDK
   */
  static init(config: SDKConfig): ACME {
    if (!ACME.instance) {
      ACME.instance = new ACME(config);
    }
    return ACME.instance;
  }

  /**
   * Get SDK instance
   */
  static getInstance(): ACME | null {
    return ACME.instance;
  }

  /**
   * Main payment entry point
   */
  static async pay(config: PaymentConfig): Promise<PaymentResult> {
    const sdk = ACME.instance;
    if (!sdk) {
      throw new Error('ACME SDK not initialized. Call ACME.init() first.');
    }
    return sdk.processPayment(config);
  }

  /**
   * Process payment
   */
  async processPayment(config: PaymentConfig): Promise<PaymentResult> {
    this.currentPaymentConfig = config;

    // Inject styles if not already done
    this.injectStyles();

    // Create UI components
    this.createUI();

    // Set up items if provided
    if (config.items) {
      this.state.clearCart();
      config.items.forEach((item) => {
        this.state.addItem(item.name, item.price, item.emoji);
      });
    }

    return new Promise((resolve, reject) => {
      // Store callbacks for later use
      const onSuccess = (result: PaymentResult) => {
        this.closePaymentSheet();
        config.onSuccess?.(result);
        resolve(result);
      };

      const onError = (error: PaymentError) => {
        this.closePaymentSheet();
        config.onError?.(error);
        reject(error);
      };

      const onCancel = () => {
        this.closePaymentSheet();
        config.onCancel?.();
        reject({ code: 'CANCELLED', message: 'Payment cancelled by user' });
      };

      // Open payment sheet
      this.openPaymentSheet(config, onSuccess, onError, onCancel);
    });
  }

  /**
   * Inject styles into the document
   */
  private injectStyles(): void {
    if (this.stylesInjected) return;

    const style = document.createElement('style');
    style.id = 'acme-payment-sdk-styles';
    style.textContent = baseStyles;
    document.head.appendChild(style);
    this.stylesInjected = true;
  }

  /**
   * Create UI components
   */
  private createUI(): void {
    // Remove existing UI if present
    document.getElementById('acme-payment-container')?.remove();

    // Create container
    const container = document.createElement('div');
    container.id = 'acme-payment-container';
    document.body.appendChild(container);

    // Create bottom sheet
    this.bottomSheet = new BottomSheet({
      onClose: () => this.currentPaymentConfig?.onCancel?.(),
    });
    this.bottomSheet.create(container);

    // Create biometric overlay
    this.biometricOverlay = new BiometricOverlay({
      title: 'Biometric Verification',
      subtitle: 'Touch the sensor or use Face ID',
      hint: 'Secure authentication via FIDO2',
    });
    this.biometricOverlay.create(container);
  }

  /**
   * Open payment sheet
   */
  private openPaymentSheet(
    config: PaymentConfig,
    onSuccess: (result: PaymentResult) => void,
    onError: (error: PaymentError) => void,
    onCancel: () => void
  ): void {
    if (!this.bottomSheet) return;

    // Build payment sheet content
    const content = this.buildPaymentSheetContent(config);
    this.bottomSheet.setContent(content);

    // Initialize payment selector
    const selectorContainer = document.querySelector(
      '.acme-payment-methods-container'
    ) as HTMLElement;
    if (selectorContainer) {
      this.paymentSelector = new PaymentSelector({
        methods: DEFAULT_PAYMENT_METHODS,
        defaultMethod: this.config.defaultPaymentMethod,
        onChange: (method) => this.updatePayButton(method),
      });
      this.paymentSelector.create(selectorContainer);
    }

    // Bind pay button
    const payBtn = document.querySelector('.acme-pay-btn') as HTMLButtonElement;
    if (payBtn) {
      payBtn.addEventListener('click', () => {
        this.handlePayment(onSuccess, onError);
      });
    }

    // Bind close button
    const closeBtn = document.querySelector('.acme-sheet-close') as HTMLButtonElement;
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        onCancel();
      });
    }

    // Open sheet
    this.bottomSheet.open();
  }

  /**
   * Build payment sheet content HTML
   */
  private buildPaymentSheetContent(config: PaymentConfig): string {
    const formattedAmount = this.state.formatPrice(config.amount);
    const merchantName = config.merchantName || this.config.merchantName || 'Merchant';

    const itemsHTML = config.items
      ? `<div class="acme-order-items">
          ${config.items
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
          <span class="acme-currency">${config.currency === 'BRL' ? 'R$' : '$'}</span>
          <span class="acme-amount-value">${this.formatAmountDisplay(config.amount)}</span>
        </div>

        <div class="acme-merchant-name">${merchantName}</div>

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
   * Update pay button text based on selected method
   */
  private updatePayButton(method: PaymentMethod): void {
    const btn = document.querySelector('.acme-pay-btn .acme-btn-content');
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
   * Handle payment process
   */
  private async handlePayment(
    onSuccess: (result: PaymentResult) => void,
    onError: (error: PaymentError) => void
  ): Promise<void> {
    const method = this.paymentSelector?.getSelected() || 'pix';
    const config = this.currentPaymentConfig;

    if (!config) {
      onError({ code: 'NO_CONFIG', message: 'Payment configuration not found' });
      return;
    }

    // Set loading state
    const btn = document.querySelector('.acme-pay-btn') as HTMLButtonElement;
    btn?.classList.add('loading');
    btn.disabled = true;

    try {
      if (method === 'pix') {
        await this.processPixPayment(config, onSuccess, onError);
      } else {
        // Other methods not implemented
        onError({
          code: 'NOT_IMPLEMENTED',
          message: `${method} payment not implemented in this demo. Please use PIX.`,
        });
      }
    } finally {
      btn?.classList.remove('loading');
      btn.disabled = false;
    }
  }

  /**
   * Process PIX payment with WebAuthn
   */
  private async processPixPayment(
    config: PaymentConfig,
    onSuccess: (result: PaymentResult) => void,
    onError: (error: PaymentError) => void
  ): Promise<void> {
    if (!isWebAuthnSupported()) {
      onError({ code: 'WEBAUTHN_NOT_SUPPORTED', message: 'WebAuthn is not supported' });
      return;
    }

    const username = 'fredagsfys'; // Default passkey account

    try {
      // Get authentication options
      const options = await this.webAuthnClient.loginStart(username);

      // Show biometric overlay and get credential
      if (!this.biometricOverlay) {
        throw new Error('Biometric overlay not initialized');
      }

      const credential = await withBiometricOverlay(this.biometricOverlay, () =>
        getCredential(options)
      );

      // Verify with server
      await this.webAuthnClient.loginFinish(username, credential);

      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Success
      const result: PaymentResult = {
        success: true,
        transactionId: `txn_${Date.now()}`,
        amount: config.amount,
        currency: config.currency,
        method: 'pix',
        timestamp: new Date(),
        items: config.items,
      };

      onSuccess(result);
    } catch (error) {
      const err = error as Error;
      if (err.name === 'NotAllowedError') {
        onError({ code: 'AUTH_CANCELLED', message: 'Authentication was cancelled' });
      } else {
        onError({ code: 'PAYMENT_FAILED', message: err.message, details: err });
      }
    }
  }

  /**
   * Close payment sheet
   */
  private closePaymentSheet(): void {
    this.bottomSheet?.close();
  }

  /**
   * Subscribe to payment events
   */
  on(type: PaymentEventType, listener: PaymentEventListener): () => void {
    return this.state.on(type, listener);
  }

  /**
   * Get payment state
   */
  getState(): PaymentState {
    return this.state;
  }

  /**
   * Destroy SDK instance
   */
  destroy(): void {
    this.bottomSheet?.destroy();
    this.biometricOverlay?.destroy();
    this.paymentSelector?.destroy();
    document.getElementById('acme-payment-container')?.remove();
    document.getElementById('acme-payment-sdk-styles')?.remove();
    ACME.instance = null;
  }
}

// Export for UMD/global usage
if (typeof window !== 'undefined') {
  (window as unknown as { ACME: typeof ACME }).ACME = ACME;
}

// Named exports for ESM
export { PaymentState } from '../core/payment-state';
export { WebAuthnClient, isWebAuthnSupported } from '../core/webauthn-service';
export { BottomSheet } from '../ui/bottom-sheet';
export { BiometricOverlay } from '../ui/biometric-overlay';
export { PaymentSelector, DEFAULT_PAYMENT_METHODS } from '../ui/payment-selector';
export * from '../core/types';
