/**
 * Biometric Overlay UI Component
 * Shows authentication feedback during WebAuthn operations
 */

import type { BiometricOverlayConfig } from '../core/types';

export class BiometricOverlay {
  private overlay: HTMLElement | null = null;
  private config: BiometricOverlayConfig;
  private cancelCallback: (() => void) | null = null;

  constructor(config: BiometricOverlayConfig = {}) {
    this.config = {
      title: 'Biometric Verification',
      subtitle: 'Touch the sensor or use Face ID',
      hint: 'Secure authentication via FIDO2',
      ...config,
    };
  }

  /**
   * Initialize with existing DOM element
   */
  init(overlayElement: HTMLElement): void {
    this.overlay = overlayElement;
    this.bindEvents();
  }

  /**
   * Create and inject overlay HTML
   */
  create(container: HTMLElement): void {
    const html = this.getHTML();
    container.insertAdjacentHTML('beforeend', html);
    this.overlay = container.querySelector('.acme-biometric-overlay');
    this.bindEvents();
  }

  /**
   * Get overlay HTML template
   */
  getHTML(): string {
    return `
      <div class="acme-biometric-overlay">
        <div class="acme-biometric-container">
          <div class="acme-biometric-icon">
            <div class="acme-biometric-ring"></div>
            <div class="acme-biometric-ring"></div>
            <div class="acme-biometric-ring"></div>
            <svg class="acme-fingerprint-svg" viewBox="0 0 100 100">
              <path d="M50 15 C25 15 15 35 15 55 C15 75 25 90 50 90 C75 90 85 75 85 55 C85 35 75 15 50 15" />
              <path d="M50 25 C32 25 25 40 25 55 C25 70 32 80 50 80 C68 80 75 70 75 55 C75 40 68 25 50 25" />
              <path d="M50 35 C40 35 35 45 35 55 C35 65 40 72 50 72 C60 72 65 65 65 55 C65 45 60 35 50 35" />
              <path d="M50 45 C45 45 43 50 43 55 C43 60 45 64 50 64 C55 64 57 60 57 55 C57 50 55 45 50 45" />
              <path class="acme-scan-line" d="M50 15 C25 15 15 35 15 55 C15 75 25 90 50 90 C75 90 85 75 85 55 C85 35 75 15 50 15" />
            </svg>
          </div>
          <div class="acme-biometric-title">${this.config.title}</div>
          <div class="acme-biometric-subtitle">${this.config.subtitle}</div>
          <div class="acme-biometric-hint">
            <svg viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
            </svg>
            ${this.config.hint}
          </div>
          <button class="acme-biometric-cancel">Cancel</button>
        </div>
      </div>
    `;
  }

  /**
   * Bind events
   */
  private bindEvents(): void {
    const cancelBtn = this.overlay?.querySelector('.acme-biometric-cancel');
    cancelBtn?.addEventListener('click', () => this.cancel());
  }

  /**
   * Show the overlay
   */
  show(): void {
    if (!this.overlay) return;

    this.overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      this.overlay?.classList.add('active');
    });
  }

  /**
   * Hide the overlay
   */
  hide(): void {
    if (!this.overlay) return;

    this.overlay.classList.remove('active');
    setTimeout(() => {
      if (this.overlay) {
        this.overlay.style.display = 'none';
      }
    }, 300);
  }

  /**
   * Cancel the biometric operation
   */
  cancel(): void {
    this.hide();
    this.cancelCallback?.();
    this.config.onCancel?.();
  }

  /**
   * Set cancel callback
   */
  onCancel(callback: () => void): void {
    this.cancelCallback = callback;
  }

  /**
   * Show success state
   */
  showSuccess(): void {
    const title = this.overlay?.querySelector('.acme-biometric-title');
    const subtitle = this.overlay?.querySelector('.acme-biometric-subtitle');
    const icon = this.overlay?.querySelector('.acme-biometric-icon');

    if (title) title.textContent = 'Verified!';
    if (subtitle) subtitle.textContent = 'Authentication successful';
    if (icon) icon.classList.add('success');

    setTimeout(() => this.hide(), 1000);
  }

  /**
   * Show error state
   */
  showError(message = 'Verification failed'): void {
    const title = this.overlay?.querySelector('.acme-biometric-title');
    const subtitle = this.overlay?.querySelector('.acme-biometric-subtitle');
    const icon = this.overlay?.querySelector('.acme-biometric-icon');

    if (title) title.textContent = 'Error';
    if (subtitle) subtitle.textContent = message;
    if (icon) icon.classList.add('error');

    setTimeout(() => this.hide(), 2000);
  }

  /**
   * Update title
   */
  setTitle(title: string): void {
    const titleEl = this.overlay?.querySelector('.acme-biometric-title');
    if (titleEl) titleEl.textContent = title;
  }

  /**
   * Update subtitle
   */
  setSubtitle(subtitle: string): void {
    const subtitleEl = this.overlay?.querySelector('.acme-biometric-subtitle');
    if (subtitleEl) subtitleEl.textContent = subtitle;
  }

  /**
   * Check if overlay is visible
   */
  isVisible(): boolean {
    return this.overlay?.classList.contains('active') || false;
  }

  /**
   * Destroy the overlay
   */
  destroy(): void {
    this.overlay?.remove();
    this.overlay = null;
    this.cancelCallback = null;
  }
}

/**
 * Create a promise-based biometric verification flow
 */
export function withBiometricOverlay<T>(
  overlay: BiometricOverlay,
  operation: () => Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    let cancelled = false;

    overlay.onCancel(() => {
      cancelled = true;
      reject(new Error('Cancelled by user'));
    });

    overlay.show();

    operation()
      .then((result) => {
        if (!cancelled) {
          overlay.showSuccess();
          resolve(result);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          overlay.showError(error.message);
          reject(error);
        }
      });
  });
}
