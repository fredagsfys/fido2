import Foundation

/// Payment request data passed to the payment sheet
struct PaymentRequest {
    let amount: Int           // Amount in cents
    let currency: String      // ISO 4217 currency code
    let merchantName: String
    let merchantId: String?
    let orderId: String?
    let description: String?

    init(
        amount: Int,
        currency: String,
        merchantName: String,
        merchantId: String? = nil,
        orderId: String? = nil,
        description: String? = nil
    ) {
        self.amount = amount
        self.currency = currency
        self.merchantName = merchantName
        self.merchantId = merchantId
        self.orderId = orderId
        self.description = description
    }

    /// Initialize from a deep link URL
    /// Expected format: acmepay://pay?amount=1000&currency=BRL&merchant=StoreName
    init?(from url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let queryItems = components.queryItems else {
            return nil
        }

        var amountValue: Int?
        var currencyValue: String = "BRL"
        var merchantNameValue: String = "Merchant"
        var merchantIdValue: String?
        var orderIdValue: String?
        var descriptionValue: String?

        for item in queryItems {
            switch item.name {
            case "amount":
                amountValue = Int(item.value ?? "")
            case "currency":
                currencyValue = item.value ?? "BRL"
            case "merchant", "merchantName":
                merchantNameValue = item.value ?? "Merchant"
            case "merchantId":
                merchantIdValue = item.value
            case "orderId":
                orderIdValue = item.value
            case "description":
                descriptionValue = item.value
            default:
                break
            }
        }

        guard let amount = amountValue else {
            return nil
        }

        self.amount = amount
        self.currency = currencyValue
        self.merchantName = merchantNameValue
        self.merchantId = merchantIdValue
        self.orderId = orderIdValue
        self.description = descriptionValue
    }

    /// Format amount for display based on currency
    func formattedAmount() -> String {
        let value = Double(amount) / 100.0
        switch currency {
        case "BRL":
            let formatted = String(format: "%.2f", value).replacingOccurrences(of: ".", with: ",")
            return "R$ \(formatted)"
        case "USD":
            return String(format: "$ %.2f", value)
        case "EUR":
            return String(format: "\u{20AC} %.2f", value)
        default:
            return String(format: "%.2f %@", value, currency)
        }
    }

    /// Create a sample request for testing/preview
    static func sample() -> PaymentRequest {
        PaymentRequest(
            amount: 2499,
            currency: "BRL",
            merchantName: "Coffee Shop",
            merchantId: "merchant_123",
            orderId: "order_456",
            description: "Cappuccino Grande"
        )
    }
}
