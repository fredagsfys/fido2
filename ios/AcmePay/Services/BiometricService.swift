import Foundation
import LocalAuthentication

/// Service for handling Face ID and Touch ID authentication
class BiometricService {
    private let context = LAContext()

    enum BiometricType {
        case none
        case touchID
        case faceID
    }

    enum BiometricError: Error, LocalizedError {
        case notAvailable
        case notEnrolled
        case authenticationFailed
        case userCancelled
        case systemCancelled
        case unknown(Error)

        var errorDescription: String? {
            switch self {
            case .notAvailable:
                return "Biometric authentication is not available on this device"
            case .notEnrolled:
                return "No biometric data is enrolled"
            case .authenticationFailed:
                return "Authentication failed"
            case .userCancelled:
                return "Authentication was cancelled"
            case .systemCancelled:
                return "Authentication was cancelled by the system"
            case .unknown(let error):
                return error.localizedDescription
            }
        }
    }

    /// Get the available biometric type on this device
    var biometricType: BiometricType {
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }

        switch context.biometryType {
        case .touchID:
            return .touchID
        case .faceID:
            return .faceID
        case .opticID:
            return .faceID  // Treat opticID similar to faceID
        case .none:
            return .none
        @unknown default:
            return .none
        }
    }

    /// Check if biometric authentication is available
    func canAuthenticate() -> Bool {
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }

    /// Authenticate with biometrics
    /// - Parameter reason: The reason displayed to the user for authentication
    /// - Returns: True if authentication succeeded
    func authenticate(reason: String) async throws {
        guard canAuthenticate() else {
            throw BiometricError.notAvailable
        }

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )

            if !success {
                throw BiometricError.authenticationFailed
            }
        } catch let error as LAError {
            switch error.code {
            case .userCancel:
                throw BiometricError.userCancelled
            case .systemCancel:
                throw BiometricError.systemCancelled
            case .biometryNotAvailable:
                throw BiometricError.notAvailable
            case .biometryNotEnrolled:
                throw BiometricError.notEnrolled
            case .authenticationFailed:
                throw BiometricError.authenticationFailed
            default:
                throw BiometricError.unknown(error)
            }
        }
    }

    /// Authenticate for payment with a formatted amount
    /// - Parameter amount: The formatted payment amount (e.g., "R$ 24,99")
    func authenticatePayment(amount: String) async throws {
        let reason = "Authenticate to pay \(amount)"
        try await authenticate(reason: reason)
    }
}
