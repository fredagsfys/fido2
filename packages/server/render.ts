/**
 * Server-side HTML Renderer for BFF Pattern
 * Generates payment UI HTML that can be served from a backend
 */

import type { ServerRenderOptions, CartItem, Currency } from '../core/types';

/**
 * Render payment page HTML
 */
export function renderPaymentPage(options: ServerRenderOptions): string {
  const { amount, currency, merchantName, sessionId, items = [], returnUrl } = options;

  const formattedAmount = formatAmount(amount, currency);
  const currencySymbol = currency === 'BRL' ? 'R$' : '$';

  const itemsHTML = items.length > 0
    ? `<div class="acme-order-items">
        ${items.map(item => `
          <div class="acme-order-item">
            <span class="acme-order-item-name">${item.emoji || ''} ${item.name}</span>
            <span class="acme-order-item-price">${formatPrice(item.price, currency)}</span>
          </div>
        `).join('')}
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment - ${merchantName}</title>
  <link rel="stylesheet" href="/styles/acme-pay.css">
</head>
<body>
  <div class="acme-payment-page">
    <div class="acme-payment-header">
      <div class="acme-logo">
        <span class="acme-logo-text">PIX</span>
        <span class="acme-logo-sub">by ACME</span>
      </div>
    </div>

    <div class="acme-payment-amount">
      <span class="acme-currency">${currencySymbol}</span>
      <span class="acme-amount-value">${formattedAmount}</span>
    </div>

    <div class="acme-merchant-name">${merchantName}</div>

    ${itemsHTML}

    <div id="paymentMethods"></div>

    <button id="payBtn" class="acme-pay-btn">
      <span class="acme-spinner"></span>
      <span class="acme-btn-content">Pay with PIX</span>
    </button>

    <input type="hidden" id="sessionId" value="${sessionId}">
    <input type="hidden" id="returnUrl" value="${returnUrl || ''}">
  </div>

  <div id="biometricOverlay" class="acme-biometric-overlay"></div>

  <script src="/js/acme-pay-client.js"></script>
  <script>
    AcmePayClient.init({
      sessionId: '${sessionId}',
      amount: ${amount},
      currency: '${currency}',
      returnUrl: '${returnUrl || ''}'
    });
  </script>
</body>
</html>`;
}

/**
 * Render minimal client JS for WebAuthn
 */
export function renderClientScript(): string {
  return `
(function() {
  window.AcmePayClient = {
    config: {},

    init: function(cfg) {
      this.config = cfg;
      this.renderPaymentMethods();
      this.bindEvents();
    },

    renderPaymentMethods: function() {
      document.getElementById('paymentMethods').innerHTML = \`
        <div class="acme-payment-methods">
          <div class="acme-payment-method primary selected" data-method="pix">
            <div class="acme-payment-method-icon pix">PIX</div>
            <div class="acme-payment-method-info">
              <div class="acme-payment-method-name">PIX by ACME</div>
              <div class="acme-payment-method-detail">Instant payment</div>
            </div>
            <div class="acme-payment-method-radio">
              <div class="acme-payment-method-radio-inner"></div>
            </div>
          </div>
        </div>
      \`;
    },

    bindEvents: function() {
      var btn = document.getElementById('payBtn');
      btn.addEventListener('click', this.processPayment.bind(this));
    },

    processPayment: async function() {
      var btn = document.getElementById('payBtn');
      btn.classList.add('loading');
      btn.disabled = true;

      try {
        await this.authenticate();
        this.onSuccess();
      } catch (err) {
        this.onError(err);
      } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
      }
    },

    authenticate: async function() {
      var username = 'fredagsfys';

      var startRes = await fetch('/api/passkey/loginStart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username })
      });
      if (!startRes.ok) throw new Error(await startRes.text());
      var options = await startRes.json();

      var publicKeyOptions = {
        challenge: this.base64urlToBuffer(options.publicKey.challenge),
        timeout: options.publicKey.timeout,
        rpId: options.publicKey.rpId,
        userVerification: 'required'
      };

      if (options.publicKey.allowCredentials) {
        publicKeyOptions.allowCredentials = options.publicKey.allowCredentials.map(function(cred) {
          return {
            id: AcmePayClient.base64urlToBuffer(cred.id),
            type: cred.type,
            transports: cred.transports
          };
        });
      }

      this.showBiometric();
      var credential;
      try {
        credential = await navigator.credentials.get({ publicKey: publicKeyOptions });
      } finally {
        this.hideBiometric();
      }

      var credentialData = {
        id: credential.id,
        rawId: this.bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          authenticatorData: this.bufferToBase64url(credential.response.authenticatorData),
          clientDataJSON: this.bufferToBase64url(credential.response.clientDataJSON),
          signature: this.bufferToBase64url(credential.response.signature),
          userHandle: credential.response.userHandle ? this.bufferToBase64url(credential.response.userHandle) : null
        }
      };

      var finishRes = await fetch('/api/passkey/loginFinish?username=' + encodeURIComponent(username), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentialData)
      });
      if (!finishRes.ok) throw new Error(await finishRes.text());
    },

    showBiometric: function() {
      var overlay = document.getElementById('biometricOverlay');
      overlay.innerHTML = '<div class="acme-biometric-container"><div class="acme-biometric-title">Verify your identity</div></div>';
      overlay.classList.add('active');
    },

    hideBiometric: function() {
      document.getElementById('biometricOverlay').classList.remove('active');
    },

    onSuccess: function() {
      if (this.config.returnUrl) {
        window.location.href = this.config.returnUrl + '?status=success&session=' + this.config.sessionId;
      }
    },

    onError: function(err) {
      alert('Payment failed: ' + err.message);
    },

    bufferToBase64url: function(buffer) {
      var bytes = new Uint8Array(buffer);
      var str = '';
      for (var i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
      return btoa(str).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '');
    },

    base64urlToBuffer: function(base64url) {
      var base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      var padLen = (4 - (base64.length % 4)) % 4;
      var binary = atob(base64 + '='.repeat(padLen));
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes.buffer;
    }
  };
})();
`;
}

/**
 * Format amount for display
 */
function formatAmount(value: number, currency: Currency): string {
  if (currency === 'BRL') {
    return value.toFixed(2).replace('.', ',');
  }
  return value.toFixed(2);
}

/**
 * Format price with currency symbol
 */
function formatPrice(value: number, currency: Currency): string {
  if (currency === 'BRL') {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  }
  return `$${value.toFixed(2)}`;
}

/**
 * Generate JSON response for headless clients
 */
export function renderPaymentJSON(options: ServerRenderOptions): object {
  return {
    sessionId: options.sessionId,
    amount: options.amount,
    currency: options.currency,
    merchantName: options.merchantName,
    items: options.items,
    endpoints: {
      loginStart: '/api/passkey/loginStart',
      loginFinish: '/api/passkey/loginFinish',
    },
  };
}
