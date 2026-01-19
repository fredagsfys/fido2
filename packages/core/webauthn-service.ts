/**
 * WebAuthn Service - Wrapper for the WebAuthn browser API
 */

import type {
  WebAuthnCredentialOptions,
  WebAuthnCredentialResponse,
  WebAuthnRegistrationOptions,
  WebAuthnRegistrationResponse,
} from './types';

/**
 * Check if WebAuthn is supported in the current browser
 */
export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

/**
 * Check if the platform authenticator is available (e.g., Touch ID, Face ID, Windows Hello)
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Convert ArrayBuffer to base64url string
 */
export function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Convert base64url string to ArrayBuffer
 */
export function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Get credential for authentication (login/payment verification)
 */
export async function getCredential(
  options: WebAuthnCredentialOptions
): Promise<WebAuthnCredentialResponse> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  const publicKeyOptions: PublicKeyCredentialRequestOptions = {
    challenge: base64urlToBuffer(options.challenge),
    timeout: options.timeout || 300000,
    rpId: options.rpId,
    userVerification: options.userVerification || 'preferred',
  };

  if (options.allowCredentials) {
    publicKeyOptions.allowCredentials = options.allowCredentials.map((cred) => ({
      id: base64urlToBuffer(cred.id),
      type: cred.type,
      transports: cred.transports,
    }));
  }

  const credential = (await navigator.credentials.get({
    publicKey: publicKeyOptions,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error('No credential received');
  }

  const response = credential.response as AuthenticatorAssertionResponse;

  return {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: bufferToBase64url(response.authenticatorData),
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      signature: bufferToBase64url(response.signature),
      userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : null,
    },
  };
}

/**
 * Create credential for registration
 */
export async function createCredential(
  options: WebAuthnRegistrationOptions
): Promise<WebAuthnRegistrationResponse> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge: base64urlToBuffer(options.challenge),
    rp: options.rp,
    user: {
      id: base64urlToBuffer(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams,
    timeout: options.timeout || 300000,
    authenticatorSelection: options.authenticatorSelection,
  };

  const credential = (await navigator.credentials.create({
    publicKey: publicKeyOptions,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error('No credential received');
  }

  const response = credential.response as AuthenticatorAttestationResponse;

  return {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      attestationObject: bufferToBase64url(response.attestationObject),
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
    },
  };
}

/**
 * WebAuthn API client for server communication
 */
export class WebAuthnClient {
  private apiBase: string;

  constructor(apiBase: string = '') {
    this.apiBase = apiBase;
  }

  /**
   * Start login flow - get options from server
   */
  async loginStart(username: string): Promise<WebAuthnCredentialOptions> {
    const response = await fetch(`${this.apiBase}/api/passkey/loginStart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();
    return {
      challenge: data.publicKey.challenge,
      timeout: data.publicKey.timeout,
      rpId: data.publicKey.rpId,
      userVerification: data.publicKey.userVerification,
      allowCredentials: data.publicKey.allowCredentials,
    };
  }

  /**
   * Finish login flow - verify credential with server
   */
  async loginFinish(username: string, credential: WebAuthnCredentialResponse): Promise<void> {
    const response = await fetch(
      `${this.apiBase}/api/passkey/loginFinish?username=${encodeURIComponent(username)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credential),
      }
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }
  }

  /**
   * Start registration flow - get options from server
   */
  async registerStart(username: string): Promise<WebAuthnRegistrationOptions> {
    const response = await fetch(`${this.apiBase}/api/passkey/registerStart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();
    return data.publicKey;
  }

  /**
   * Finish registration flow - verify credential with server
   */
  async registerFinish(
    username: string,
    credential: WebAuthnRegistrationResponse
  ): Promise<void> {
    const response = await fetch(
      `${this.apiBase}/api/passkey/registerFinish?username=${encodeURIComponent(username)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credential),
      }
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }
  }

  /**
   * Full login flow - combines start, credential get, and finish
   */
  async login(username: string): Promise<void> {
    const options = await this.loginStart(username);
    const credential = await getCredential(options);
    await this.loginFinish(username, credential);
  }

  /**
   * Full registration flow - combines start, credential create, and finish
   */
  async register(username: string): Promise<void> {
    const options = await this.registerStart(username);
    const credential = await createCredential(options);
    await this.registerFinish(username, credential);
  }
}
