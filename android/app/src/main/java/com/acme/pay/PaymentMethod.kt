package com.acme.pay

import androidx.annotation.DrawableRes

/**
 * Represents a payment method in the payment sheet
 */
data class PaymentMethod(
    val id: String,
    val type: Type,
    val name: String,
    val details: String,
    @DrawableRes val iconRes: Int,
    val isDefault: Boolean = false,
    val isFeatured: Boolean = false,  // Featured = larger display (like PIX)
    val balance: Long? = null          // Balance in cents (for PIX/wallet)
) {
    enum class Type {
        PIX,
        CARD,
        BANK_TRANSFER,
        KLARNA
    }

    /**
     * Format balance for display
     */
    fun formatBalance(): String? {
        val balanceValue = balance ?: return null
        val value = balanceValue / 100.0
        return "R$ %.2f available".format(value).replace(".", ",")
    }

    companion object {
        /**
         * Get payment methods with PIX as featured default
         */
        fun getDefaultMethods(): List<PaymentMethod> = listOf(
            // PIX is the featured default option
            PaymentMethod(
                id = "pix_acme",
                type = Type.PIX,
                name = "Pix",
                details = "by Acme Pay • Instant",
                iconRes = R.drawable.ic_pix,
                isDefault = true,
                isFeatured = true,
                balance = 125000  // R$ 1.250,00
            ),
            // Alternative payment methods
            PaymentMethod(
                id = "visa_4242",
                type = Type.CARD,
                name = "Visa",
                details = "•••• 4242",
                iconRes = R.drawable.ic_card_visa
            ),
            PaymentMethod(
                id = "mc_5555",
                type = Type.CARD,
                name = "Mastercard",
                details = "•••• 5555",
                iconRes = R.drawable.ic_card_mastercard
            )
        )

        fun getFeatured(): PaymentMethod? = getDefaultMethods().find { it.isFeatured }
        fun getAlternatives(): List<PaymentMethod> = getDefaultMethods().filter { !it.isFeatured }
    }
}

/**
 * Payment request data passed to the payment sheet
 */
data class PaymentRequest(
    val amount: Long,           // Amount in cents
    val currency: String,       // ISO 4217 currency code
    val merchantName: String,
    val merchantId: String? = null,
    val orderId: String? = null,
    val description: String? = null
) {
    /**
     * Format amount for display
     */
    fun formatAmount(): String {
        val value = amount / 100.0
        return when (currency) {
            "BRL" -> "R$ %.2f".format(value).replace(".", ",")
            "USD" -> "$ %.2f".format(value)
            "EUR" -> "€ %.2f".format(value)
            else -> "%.2f %s".format(value, currency)
        }
    }

    companion object {
        const val EXTRA_AMOUNT = "com.acme.pay.AMOUNT"
        const val EXTRA_CURRENCY = "com.acme.pay.CURRENCY"
        const val EXTRA_MERCHANT_NAME = "com.acme.pay.MERCHANT_NAME"
        const val EXTRA_MERCHANT_ID = "com.acme.pay.MERCHANT_ID"
        const val EXTRA_ORDER_ID = "com.acme.pay.ORDER_ID"
        const val EXTRA_DESCRIPTION = "com.acme.pay.DESCRIPTION"
    }
}

/**
 * Payment result returned to the calling app
 */
sealed class PaymentResult {
    data class Success(
        val transactionId: String,
        val paymentMethodId: String
    ) : PaymentResult()

    data class Error(
        val code: Int,
        val message: String
    ) : PaymentResult()

    object Cancelled : PaymentResult()

    companion object {
        const val EXTRA_RESULT = "com.acme.pay.RESULT"
        const val EXTRA_TRANSACTION_ID = "com.acme.pay.TRANSACTION_ID"
        const val EXTRA_PAYMENT_METHOD_ID = "com.acme.pay.PAYMENT_METHOD_ID"
        const val EXTRA_ERROR_CODE = "com.acme.pay.ERROR_CODE"
        const val EXTRA_ERROR_MESSAGE = "com.acme.pay.ERROR_MESSAGE"

        const val RESULT_SUCCESS = 1
        const val RESULT_ERROR = 2
        const val RESULT_CANCELLED = 3
    }
}
