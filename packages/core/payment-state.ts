/**
 * Payment State Management
 */

import type {
  CartItem,
  PaymentMethod,
  Currency,
  PaymentEvent,
  PaymentEventType,
  PaymentEventListener,
} from './types';

/**
 * Payment State - manages cart, payment method, and current user
 */
export class PaymentState {
  private cart: CartItem[] = [];
  private selectedPaymentMethod: PaymentMethod = 'pix';
  private currentUser: string | null = null;
  private currency: Currency = 'BRL';
  private listeners: Map<PaymentEventType, Set<PaymentEventListener>> = new Map();

  /**
   * Add item to cart
   */
  addItem(name: string, price: number, emoji?: string): CartItem {
    const item: CartItem = {
      id: Date.now(),
      name,
      price,
      quantity: 1,
      emoji,
    };
    this.cart.push(item);
    this.emit('payment:start', { item });
    return item;
  }

  /**
   * Remove item from cart by ID
   */
  removeItem(id: number): boolean {
    const index = this.cart.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.cart.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all items from cart
   */
  clearCart(): void {
    this.cart = [];
  }

  /**
   * Get all cart items
   */
  getItems(): CartItem[] {
    return [...this.cart];
  }

  /**
   * Get cart item count
   */
  getItemCount(): number {
    return this.cart.length;
  }

  /**
   * Get cart total
   */
  getTotal(): number {
    return this.cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  }

  /**
   * Check if cart is empty
   */
  isEmpty(): boolean {
    return this.cart.length === 0;
  }

  /**
   * Set selected payment method
   */
  setPaymentMethod(method: PaymentMethod): void {
    this.selectedPaymentMethod = method;
  }

  /**
   * Get selected payment method
   */
  getPaymentMethod(): PaymentMethod {
    return this.selectedPaymentMethod;
  }

  /**
   * Set current user
   */
  setUser(username: string | null): void {
    this.currentUser = username;
  }

  /**
   * Get current user
   */
  getUser(): string | null {
    return this.currentUser;
  }

  /**
   * Set currency
   */
  setCurrency(currency: Currency): void {
    this.currency = currency;
  }

  /**
   * Get currency
   */
  getCurrency(): Currency {
    return this.currency;
  }

  /**
   * Format price in current currency
   */
  formatPrice(value: number): string {
    switch (this.currency) {
      case 'BRL':
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
      case 'USD':
        return `$${value.toFixed(2)}`;
      case 'EUR':
        return `${value.toFixed(2).replace('.', ',')}`;
      default:
        return value.toFixed(2);
    }
  }

  /**
   * Subscribe to payment events
   */
  on(type: PaymentEventType, listener: PaymentEventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  /**
   * Emit payment event
   */
  emit(type: PaymentEventType, data?: unknown): void {
    const event: PaymentEvent = {
      type,
      timestamp: new Date(),
      data,
    };

    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach((listener) => listener(event));
    }
  }

  /**
   * Create a snapshot of current state
   */
  snapshot(): PaymentStateSnapshot {
    return {
      cart: [...this.cart],
      selectedPaymentMethod: this.selectedPaymentMethod,
      currentUser: this.currentUser,
      currency: this.currency,
      total: this.getTotal(),
    };
  }

  /**
   * Restore state from snapshot
   */
  restore(snapshot: PaymentStateSnapshot): void {
    this.cart = [...snapshot.cart];
    this.selectedPaymentMethod = snapshot.selectedPaymentMethod;
    this.currentUser = snapshot.currentUser;
    this.currency = snapshot.currency;
  }
}

export interface PaymentStateSnapshot {
  cart: CartItem[];
  selectedPaymentMethod: PaymentMethod;
  currentUser: string | null;
  currency: Currency;
  total: number;
}

/**
 * Default product emojis for common product names
 */
export const DEFAULT_PRODUCT_EMOJIS: Record<string, string> = {
  'Laptop Pro': '//laptop',
  'Smartphone X': '//phone',
  'Wireless Headphones': '//headphones',
  'Smart Watch': '//watch',
};

/**
 * Get emoji for product name
 */
export function getProductEmoji(name: string): string {
  return DEFAULT_PRODUCT_EMOJIS[name] || '//package';
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency: Currency): string {
  const formatters: Record<Currency, Intl.NumberFormat> = {
    BRL: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
    USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
  };
  return formatters[currency].format(value);
}
