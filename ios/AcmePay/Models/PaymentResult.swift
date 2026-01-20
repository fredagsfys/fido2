import Foundation

/// Result of a payment attempt
enum PaymentResult {
    case success(transactionId: String, paymentMethodId: String)
    case error(code: Int, message: String)
    case cancelled

    /// Result codes for error handling
    enum ErrorCode: Int {
        case unknown = -1
        case biometricFailed = 1001
        case biometricNotAvailable = 1002
        case biometricCancelled = 1003
        case paymentFailed = 2001
        case networkError = 3001
    }

    /// Create a success result with generated transaction ID
    static func makeSuccess(paymentMethodId: String) -> PaymentResult {
        let transactionId = "txn_\(Int(Date().timeIntervalSince1970 * 1000))"
        return .success(transactionId: transactionId, paymentMethodId: paymentMethodId)
    }

    /// Convert result to URL query parameters for callback
    func toQueryItems() -> [URLQueryItem] {
        switch self {
        case .success(let transactionId, let paymentMethodId):
            return [
                URLQueryItem(name: "result", value: "success"),
                URLQueryItem(name: "transactionId", value: transactionId),
                URLQueryItem(name: "paymentMethodId", value: paymentMethodId)
            ]
        case .error(let code, let message):
            return [
                URLQueryItem(name: "result", value: "error"),
                URLQueryItem(name: "errorCode", value: String(code)),
                URLQueryItem(name: "errorMessage", value: message)
            ]
        case .cancelled:
            return [
                URLQueryItem(name: "result", value: "cancelled")
            ]
        }
    }
}
