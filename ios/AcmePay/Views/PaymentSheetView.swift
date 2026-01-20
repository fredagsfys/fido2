import SwiftUI

/// Main payment sheet view displayed as a bottom sheet
struct PaymentSheetView: View {
    let request: PaymentRequest
    let onComplete: (PaymentResult) -> Void

    @State private var selectedMethod: PaymentMethod? = PaymentMethod.featured()
    @State private var paymentState: PaymentState = .idle

    @Environment(\.dismiss) private var dismiss

    private let biometricService = BiometricService()

    enum PaymentState: Equatable {
        case idle
        case authenticating
        case processing
        case success
        case error(String)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Drag handle
            RoundedRectangle(cornerRadius: 2.5)
                .fill(Color("textTertiary").opacity(0.5))
                .frame(width: 32, height: 5)
                .padding(.top, 12)
                .padding(.bottom, 20)

            // Content
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Header
                    headerSection

                    // Featured payment method (PIX)
                    featuredSection

                    // Alternative payment methods
                    alternativesSection

                    // Pay button
                    payButton
                        .padding(.top, 24)

                    // Powered by footer
                    footerSection
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 32)
            }
        }
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(request.merchantName)
                .font(.system(size: 14))
                .foregroundColor(Color("textSecondary"))

            Text(request.formattedAmount())
                .font(.system(size: 36, weight: .bold))
                .foregroundColor(Color("textPrimary"))
        }
        .padding(.bottom, 24)
    }

    // MARK: - Featured Payment

    private var featuredSection: some View {
        Group {
            if let featured = PaymentMethod.featured() {
                FeaturedPaymentView(
                    method: featured,
                    isSelected: selectedMethod?.id == featured.id,
                    onSelect: {
                        selectedMethod = featured
                    }
                )
            }
        }
    }

    // MARK: - Alternatives

    private var alternativesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("OTHER PAYMENT METHODS")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(Color("textTertiary"))
                .tracking(0.5)
                .padding(.top, 20)

            ForEach(PaymentMethod.alternatives()) { method in
                PaymentMethodRow(
                    method: method,
                    isSelected: selectedMethod?.id == method.id,
                    onSelect: {
                        selectedMethod = method
                    }
                )
            }
        }
    }

    // MARK: - Pay Button

    private var payButton: some View {
        Button(action: initiatePayment) {
            HStack(spacing: 8) {
                if paymentState == .authenticating || paymentState == .processing {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(0.8)
                } else if paymentState == .success {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                } else {
                    Image(systemName: biometricIconName)
                        .font(.system(size: 20))
                }

                Text(buttonTitle)
                    .font(.system(size: 16, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(buttonBackgroundColor)
            .foregroundColor(.white)
            .cornerRadius(28)
        }
        .disabled(selectedMethod == nil || paymentState != .idle)
        .animation(.easeInOut(duration: 0.2), value: paymentState)
    }

    private var biometricIconName: String {
        switch biometricService.biometricType {
        case .faceID:
            return "faceid"
        case .touchID:
            return "touchid"
        case .none:
            return "lock.fill"
        }
    }

    private var buttonTitle: String {
        switch paymentState {
        case .idle:
            if let method = selectedMethod {
                return "Pay with \(method.name)"
            }
            return "Select payment method"
        case .authenticating:
            return "Authenticating..."
        case .processing:
            return "Processing..."
        case .success:
            return "Payment Successful"
        case .error(let message):
            return message
        }
    }

    private var buttonBackgroundColor: Color {
        switch paymentState {
        case .success:
            return Color("gpaySuccess")
        case .error:
            return Color("gpayError")
        default:
            return Color("gpayPrimary")
        }
    }

    // MARK: - Footer

    private var footerSection: some View {
        Text("Powered by Acme")
            .font(.system(size: 11))
            .foregroundColor(Color("textTertiary"))
            .frame(maxWidth: .infinity)
            .padding(.top, 16)
    }

    // MARK: - Payment Flow

    private func initiatePayment() {
        guard let method = selectedMethod else { return }

        paymentState = .authenticating

        Task {
            do {
                if biometricService.canAuthenticate() {
                    try await biometricService.authenticatePayment(
                        amount: request.formattedAmount()
                    )
                }

                await processPayment(method: method)
            } catch let error as BiometricService.BiometricError {
                await MainActor.run {
                    switch error {
                    case .userCancelled, .systemCancelled:
                        paymentState = .idle
                    default:
                        paymentState = .error(error.localizedDescription ?? "Authentication failed")
                        resetAfterDelay()
                    }
                }
            } catch {
                await MainActor.run {
                    paymentState = .error("Authentication failed")
                    resetAfterDelay()
                }
            }
        }
    }

    private func processPayment(method: PaymentMethod) async {
        await MainActor.run {
            paymentState = .processing
        }

        // Simulate payment processing
        try? await Task.sleep(nanoseconds: 500_000_000)

        await MainActor.run {
            paymentState = .success
        }

        // Wait for success animation, then complete
        try? await Task.sleep(nanoseconds: 1_000_000_000)

        await MainActor.run {
            let result = PaymentResult.makeSuccess(paymentMethodId: method.id)
            onComplete(result)
            dismiss()
        }
    }

    private func resetAfterDelay() {
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            await MainActor.run {
                paymentState = .idle
            }
        }
    }
}

#Preview {
    PaymentSheetView(
        request: PaymentRequest.sample(),
        onComplete: { _ in }
    )
}
