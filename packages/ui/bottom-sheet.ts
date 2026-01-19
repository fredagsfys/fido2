/**
 * Bottom Sheet UI Component
 * Native-feel bottom sheet with touch gestures
 */

import type { BottomSheetConfig, BottomSheetState } from '../core/types';

export class BottomSheet {
  private sheet: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private handle: HTMLElement | null = null;
  private scrollContainer: HTMLElement | null = null;
  private config: BottomSheetConfig;
  private state: BottomSheetState = {
    isOpen: false,
    isDragging: false,
    currentY: 0,
  };

  private startY = 0;
  private sheetHeight = 0;
  private startTime = 0;

  constructor(config: BottomSheetConfig = {}) {
    this.config = {
      closeThreshold: 0.3,
      velocityThreshold: 0.5,
      ...config,
    };
  }

  /**
   * Initialize bottom sheet with existing DOM elements
   */
  init(
    sheetElement: HTMLElement,
    overlayElement: HTMLElement,
    handleElement: HTMLElement,
    scrollContainer?: HTMLElement
  ): void {
    this.sheet = sheetElement;
    this.overlay = overlayElement;
    this.handle = handleElement;
    this.scrollContainer = scrollContainer || null;

    this.bindEvents();
  }

  /**
   * Create and inject bottom sheet HTML
   */
  create(container: HTMLElement): void {
    const html = this.getHTML();
    container.insertAdjacentHTML('beforeend', html);

    this.sheet = container.querySelector('.acme-bottom-sheet');
    this.overlay = container.querySelector('.acme-bottom-sheet-overlay');
    this.handle = container.querySelector('.acme-bottom-sheet-handle-area');
    this.scrollContainer = container.querySelector('.acme-bottom-sheet-scroll');

    this.bindEvents();
  }

  /**
   * Get bottom sheet HTML template
   */
  getHTML(): string {
    return `
      <div class="acme-bottom-sheet-overlay"></div>
      <div class="acme-bottom-sheet">
        <div class="acme-bottom-sheet-handle-area">
          <div class="acme-bottom-sheet-handle"></div>
        </div>
        <div class="acme-bottom-sheet-scroll">
          <div class="acme-bottom-sheet-content"></div>
        </div>
      </div>
    `;
  }

  /**
   * Bind touch and mouse events
   */
  private bindEvents(): void {
    if (!this.handle || !this.sheet || !this.overlay) return;

    // Handle drag events
    this.handle.addEventListener('mousedown', this.onStart.bind(this));
    this.handle.addEventListener('touchstart', this.onStart.bind(this), { passive: true });

    // Document events for move/end
    document.addEventListener('mousemove', this.onMove.bind(this));
    document.addEventListener('touchmove', this.onMove.bind(this), { passive: true });
    document.addEventListener('mouseup', this.onEnd.bind(this));
    document.addEventListener('touchend', this.onEnd.bind(this));

    // Overlay click to close
    this.overlay.addEventListener('click', () => this.close());
  }

  /**
   * Get Y position from mouse or touch event
   */
  private getY(e: MouseEvent | TouchEvent): number {
    return 'touches' in e ? e.touches[0].clientY : e.clientY;
  }

  /**
   * Handle drag start
   */
  private onStart(e: MouseEvent | TouchEvent): void {
    if (!this.state.isOpen || !this.sheet) return;

    this.state.isDragging = true;
    this.startY = this.getY(e);
    this.state.currentY = 0;
    this.sheetHeight = this.sheet.offsetHeight;
    this.startTime = Date.now();

    this.sheet.classList.remove('animating');
    this.sheet.classList.add('dragging');
  }

  /**
   * Handle drag move
   */
  private onMove(e: MouseEvent | TouchEvent): void {
    if (!this.state.isDragging || !this.sheet || !this.overlay) return;

    const y = this.getY(e);
    this.state.currentY = Math.max(0, y - this.startY);

    // Rubber band effect when dragging up
    if (this.state.currentY < 0) {
      this.state.currentY = this.state.currentY * 0.3;
    }

    // Update sheet position
    this.sheet.style.transform = `translateY(${this.state.currentY}px)`;

    // Update overlay opacity based on drag
    const progress = 1 - this.state.currentY / this.sheetHeight;
    this.overlay.style.background = `rgba(0,0,0,${0.4 * Math.max(0, Math.min(1, progress))})`;
  }

  /**
   * Handle drag end
   */
  private onEnd(): void {
    if (!this.state.isDragging || !this.sheet || !this.overlay) return;

    this.state.isDragging = false;
    this.sheet.classList.remove('dragging');
    this.sheet.classList.add('animating');

    const elapsed = Date.now() - this.startTime;
    const velocity = this.state.currentY / elapsed;

    // Close if dragged more than threshold or with high velocity
    if (
      this.state.currentY > this.sheetHeight * (this.config.closeThreshold || 0.3) ||
      velocity > (this.config.velocityThreshold || 0.5)
    ) {
      this.close();
    } else {
      // Snap back
      this.sheet.style.transform = 'translateY(0)';
      this.overlay.style.background = '';
    }

    // Clean up inline styles after animation
    setTimeout(() => {
      if (this.sheet?.classList.contains('active')) {
        this.sheet.style.transform = '';
      }
    }, 500);
  }

  /**
   * Open the bottom sheet
   */
  open(): void {
    if (!this.sheet || !this.overlay) return;

    this.state.isOpen = true;
    this.overlay.classList.add('active');
    this.sheet.classList.add('animating');
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      this.sheet?.classList.add('active');
    });

    this.config.onOpen?.();
  }

  /**
   * Close the bottom sheet
   */
  close(): void {
    if (!this.sheet || !this.overlay) return;

    this.state.isOpen = false;
    this.sheet.classList.add('animating');
    this.sheet.classList.remove('active');
    this.sheet.style.transform = '';
    this.overlay.classList.remove('active');
    this.overlay.style.background = '';
    document.body.style.overflow = '';

    this.config.onClose?.();
  }

  /**
   * Toggle the bottom sheet
   */
  toggle(): void {
    if (this.state.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Check if sheet is open
   */
  isOpen(): boolean {
    return this.state.isOpen;
  }

  /**
   * Get the content container element
   */
  getContentContainer(): HTMLElement | null {
    return this.sheet?.querySelector('.acme-bottom-sheet-content') || null;
  }

  /**
   * Set content HTML
   */
  setContent(html: string): void {
    const container = this.getContentContainer();
    if (container) {
      container.innerHTML = html;
    }
  }

  /**
   * Destroy the bottom sheet and remove event listeners
   */
  destroy(): void {
    if (this.handle) {
      this.handle.removeEventListener('mousedown', this.onStart.bind(this));
      this.handle.removeEventListener('touchstart', this.onStart.bind(this));
    }

    document.removeEventListener('mousemove', this.onMove.bind(this));
    document.removeEventListener('touchmove', this.onMove.bind(this));
    document.removeEventListener('mouseup', this.onEnd.bind(this));
    document.removeEventListener('touchend', this.onEnd.bind(this));

    this.sheet?.remove();
    this.overlay?.remove();

    this.sheet = null;
    this.overlay = null;
    this.handle = null;
    this.scrollContainer = null;
  }
}
