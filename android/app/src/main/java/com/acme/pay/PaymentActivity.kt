package com.acme.pay

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.nfc.NdefMessage
import android.nfc.NfcAdapter
import android.os.Bundle
import android.view.animation.DecelerateInterpolator
import androidx.appcompat.app.AppCompatActivity
import com.acme.pay.databinding.ActivityPaymentBinding

/**
 * Minimal payment activity that shows a bottom sheet.
 * Triggered by:
 * - Web deep link: https://pay.acme.com/pay?amount=1000&currency=BRL&merchant=Store
 * - Custom scheme: acmepay://pay?amount=1000&currency=BRL&merchant=Store
 * - NFC tag with NDEF URL
 * - Intent from other apps
 */
class PaymentActivity : AppCompatActivity(), PaymentBottomSheetFragment.PaymentListener {

    private lateinit var binding: ActivityPaymentBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityPaymentBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Setup scrim click to dismiss
        binding.scrimView.setOnClickListener {
            cancelPayment()
        }

        // Animate scrim in
        binding.scrimView.alpha = 0f
        binding.scrimView.animate()
            .alpha(1f)
            .setDuration(200)
            .setInterpolator(DecelerateInterpolator())
            .start()

        // Parse payment request from intent
        if (savedInstanceState == null) {
            val request = parseIntent(intent)
            showPaymentSheet(request)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Handle new NFC tag or deep link while activity is open
        val request = parseIntent(intent)
        showPaymentSheet(request)
    }

    private fun parseIntent(intent: Intent): PaymentRequest {
        return when {
            // Deep link (https:// or acmepay://)
            intent.action == Intent.ACTION_VIEW && intent.data != null -> {
                parseDeepLink(intent.data!!)
            }
            // NFC tag
            intent.action == NfcAdapter.ACTION_NDEF_DISCOVERED -> {
                parseNfcIntent(intent)
            }
            // Direct intent with extras
            intent.hasExtra(PaymentRequest.EXTRA_AMOUNT) -> {
                PaymentRequest(
                    amount = intent.getLongExtra(PaymentRequest.EXTRA_AMOUNT, 0),
                    currency = intent.getStringExtra(PaymentRequest.EXTRA_CURRENCY) ?: "BRL",
                    merchantName = intent.getStringExtra(PaymentRequest.EXTRA_MERCHANT_NAME) ?: "Merchant",
                    merchantId = intent.getStringExtra(PaymentRequest.EXTRA_MERCHANT_ID),
                    orderId = intent.getStringExtra(PaymentRequest.EXTRA_ORDER_ID)
                )
            }
            // Demo mode (launched from app icon)
            else -> {
                PaymentRequest(
                    amount = 0,
                    currency = "BRL",
                    merchantName = "Demo",
                    description = "Tap NFC tag or open deep link to pay"
                )
            }
        }
    }

    private fun parseDeepLink(uri: Uri): PaymentRequest {
        // Parse: https://pay.acme.com/pay?amount=1000&currency=BRL&merchant=Store
        // Or: acmepay://pay?amount=1000&currency=BRL&merchant=Store
        val amount = uri.getQueryParameter("amount")?.toLongOrNull() ?: 0
        val currency = uri.getQueryParameter("currency") ?: "BRL"
        val merchant = uri.getQueryParameter("merchant") ?: "Merchant"
        val merchantId = uri.getQueryParameter("merchant_id")
        val orderId = uri.getQueryParameter("order_id")

        return PaymentRequest(
            amount = amount,
            currency = currency,
            merchantName = merchant,
            merchantId = merchantId,
            orderId = orderId
        )
    }

    @Suppress("DEPRECATION")
    private fun parseNfcIntent(intent: Intent): PaymentRequest {
        // Parse NDEF message from NFC tag
        val rawMessages = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES)

        if (rawMessages != null && rawMessages.isNotEmpty()) {
            val message = rawMessages[0] as NdefMessage
            val record = message.records.firstOrNull()

            if (record != null) {
                // Try to parse as URI
                val payload = String(record.payload, Charsets.UTF_8)
                // NDEF URI record has a prefix byte, skip it for https
                val uriString = if (payload.startsWith("\u0004")) {
                    "https://" + payload.substring(1)
                } else if (payload.startsWith("\u0003")) {
                    "http://" + payload.substring(1)
                } else {
                    payload
                }

                try {
                    val uri = Uri.parse(uriString)
                    return parseDeepLink(uri)
                } catch (e: Exception) {
                    // Fall through to default
                }
            }
        }

        // Default if NFC parsing fails
        return PaymentRequest(
            amount = 0,
            currency = "BRL",
            merchantName = "NFC Payment"
        )
    }

    private fun showPaymentSheet(request: PaymentRequest) {
        // Dismiss any existing sheet
        supportFragmentManager.findFragmentByTag(PaymentBottomSheetFragment.TAG)?.let {
            (it as? PaymentBottomSheetFragment)?.dismiss()
        }

        val fragment = PaymentBottomSheetFragment.newInstance(request).apply {
            setPaymentListener(this@PaymentActivity)
        }
        fragment.show(supportFragmentManager, PaymentBottomSheetFragment.TAG)
    }

    override fun onPaymentSuccess(result: PaymentResult.Success) {
        val resultIntent = Intent().apply {
            putExtra(PaymentResult.EXTRA_RESULT, PaymentResult.RESULT_SUCCESS)
            putExtra(PaymentResult.EXTRA_TRANSACTION_ID, result.transactionId)
            putExtra(PaymentResult.EXTRA_PAYMENT_METHOD_ID, result.paymentMethodId)
        }
        setResult(Activity.RESULT_OK, resultIntent)
        finishWithAnimation()
    }

    override fun onPaymentError(result: PaymentResult.Error) {
        val resultIntent = Intent().apply {
            putExtra(PaymentResult.EXTRA_RESULT, PaymentResult.RESULT_ERROR)
            putExtra(PaymentResult.EXTRA_ERROR_CODE, result.code)
            putExtra(PaymentResult.EXTRA_ERROR_MESSAGE, result.message)
        }
        setResult(Activity.RESULT_CANCELED, resultIntent)
        finishWithAnimation()
    }

    override fun onPaymentCancelled() {
        cancelPayment()
    }

    private fun cancelPayment() {
        val resultIntent = Intent().apply {
            putExtra(PaymentResult.EXTRA_RESULT, PaymentResult.RESULT_CANCELLED)
        }
        setResult(Activity.RESULT_CANCELED, resultIntent)
        finishWithAnimation()
    }

    @Suppress("DEPRECATION")
    private fun finishWithAnimation() {
        binding.scrimView.animate()
            .alpha(0f)
            .setDuration(200)
            .setInterpolator(DecelerateInterpolator())
            .withEndAction {
                finish()
                overridePendingTransition(0, 0)
            }
            .start()
    }

    @Deprecated("Use OnBackPressedCallback")
    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        super.onBackPressed()
        cancelPayment()
    }

    companion object {
        const val ACTION_PAY = "com.acme.pay.ACTION_PAY"

        /**
         * Create an intent to launch payment
         */
        fun createIntent(
            context: Context,
            amount: Long,
            currency: String,
            merchantName: String,
            merchantId: String? = null,
            orderId: String? = null
        ): Intent {
            return Intent(context, PaymentActivity::class.java).apply {
                action = ACTION_PAY
                putExtra(PaymentRequest.EXTRA_AMOUNT, amount)
                putExtra(PaymentRequest.EXTRA_CURRENCY, currency)
                putExtra(PaymentRequest.EXTRA_MERCHANT_NAME, merchantName)
                merchantId?.let { putExtra(PaymentRequest.EXTRA_MERCHANT_ID, it) }
                orderId?.let { putExtra(PaymentRequest.EXTRA_ORDER_ID, it) }
            }
        }
    }
}
