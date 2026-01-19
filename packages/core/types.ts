/**
 * Core types for the ACME Payment SDK
 */

// ============================================================================
// Payment Types
// ============================================================================

export type PaymentMethod = 'pix' | 'card' | 'klarna';

export type Currency = 'BRL' | 'USD' | 'EUR';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity?: number;
  emoji?: string;
}

export interface PaymentConfig {
  amount: number;
  currency: Currency;
  merchantId?: string;
  merchantName?: string;
  items?: CartItem[];
  apiBase?: string;
  onSuccess?: (result: PaymentResult) => void;
  onError?: (error: PaymentError) => void;
  onCancel?: () => void;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  timestamp: Date;
  items?: CartItem[];
}

export interface PaymentError {
  code: string;
  message: string;
  details?: unknown;
}

// ============================================================================
// WebAuthn Types
// ============================================================================

export interface WebAuthnCredentialOptions {
  challenge: string;
  timeout?: number;
  rpId: string;
  userVerification?: UserVerificationRequirement;
  allowCredentials?: PublicKeyCredentialDescriptorJSON[];
}

export interface PublicKeyCredentialDescriptorJSON {
  id: string;
  type: 'public-key';
  transports?: AuthenticatorTransport[];
}

export interface WebAuthnRegistrationOptions {
  rp: {
    name: string;
    id: string;
  };
  user: {
    name: string;
    displayName: string;
    id: string;
  };
  challenge: string;
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;
  }>;
  timeout?: number;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
}

export interface WebAuthnCredentialResponse {
  id: string;
  rawId: string;
  type: string;
  response: {
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
    userHandle?: string | null;
  };
}

export interface WebAuthnRegistrationResponse {
  id: string;
  rawId: string;
  type: string;
  response: {
    attestationObject: string;
    clientDataJSON: string;
  };
}

// ============================================================================
// UI Component Types
// ============================================================================

export interface BottomSheetConfig {
  onClose?: () => void;
  onOpen?: () => void;
  closeThreshold?: number;
  velocityThreshold?: number;
}

export interface BottomSheetState {
  isOpen: boolean;
  isDragging: boolean;
  currentY: number;
}

export interface BiometricOverlayConfig {
  title?: string;
  subtitle?: string;
  hint?: string;
  onCancel?: () => void;
}

export interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  detail: string;
  icon: string;
  badge?: string;
  balance?: number;
  isPrimary?: boolean;
}

// ============================================================================
// SDK Configuration Types
// ============================================================================

export interface SDKConfig {
  apiBase: string;
  merchantId: string;
  merchantName?: string;
  defaultCurrency?: Currency;
  defaultPaymentMethod?: PaymentMethod;
  theme?: ThemeConfig;
}

export interface ThemeConfig {
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  borderRadius?: string;
}

// ============================================================================
// Event Types
// ============================================================================

export type PaymentEventType =
  | 'payment:start'
  | 'payment:success'
  | 'payment:error'
  | 'payment:cancel'
  | 'auth:start'
  | 'auth:success'
  | 'auth:error'
  | 'sheet:open'
  | 'sheet:close';

export interface PaymentEvent {
  type: PaymentEventType;
  timestamp: Date;
  data?: unknown;
}

export type PaymentEventListener = (event: PaymentEvent) => void;

// ============================================================================
// Server/BFF Types
// ============================================================================

export interface ServerRenderOptions {
  amount: number;
  currency: Currency;
  merchantName: string;
  sessionId: string;
  items?: CartItem[];
  returnUrl?: string;
}

export interface IframeMessage {
  type: 'payment:success' | 'payment:error' | 'payment:cancel' | 'ready';
  payload?: unknown;
}
