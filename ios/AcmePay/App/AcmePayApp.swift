import SwiftUI
import CoreNFC

@main
struct AcmePayApp: App {
    @State private var showPaymentSheet = false
    @State private var paymentRequest: PaymentRequest?
    @State private var nfcSession: NFCNDEFReaderSession?

    var body: some Scene {
        WindowGroup {
            ContentView(
                showPaymentSheet: $showPaymentSheet,
                paymentRequest: $paymentRequest,
                onStartNFC: startNFCSession
            )
            .onOpenURL { url in
                handleDeepLink(url)
            }
            .sheet(isPresented: $showPaymentSheet) {
                if let request = paymentRequest {
                    PaymentSheetView(request: request) { result in
                        handlePaymentResult(result)
                    }
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
                }
            }
        }
    }

    // MARK: - Deep Link Handling

    private func handleDeepLink(_ url: URL) {
        // Handle both custom scheme (acmepay://) and universal links (https://pay.acme.com)
        if let request = PaymentRequest(from: url) {
            paymentRequest = request
            showPaymentSheet = true
        }
    }

    // MARK: - NFC Handling

    private func startNFCSession() {
        guard NFCNDEFReaderSession.readingAvailable else {
            print("NFC is not available on this device")
            return
        }

        nfcSession = NFCNDEFReaderSession(
            delegate: NFCDelegate(onURL: handleDeepLink),
            queue: nil,
            invalidateAfterFirstRead: true
        )
        nfcSession?.alertMessage = "Hold your iPhone near the payment tag"
        nfcSession?.begin()
    }

    // MARK: - Payment Result

    private func handlePaymentResult(_ result: PaymentResult) {
        switch result {
        case .success(let transactionId, let paymentMethodId):
            print("Payment successful: \(transactionId), method: \(paymentMethodId)")
            // Could open callback URL or send notification
        case .error(let code, let message):
            print("Payment error: \(code) - \(message)")
        case .cancelled:
            print("Payment cancelled")
        }

        // Reset state
        showPaymentSheet = false
        paymentRequest = nil
    }
}

// MARK: - Content View

struct ContentView: View {
    @Binding var showPaymentSheet: Bool
    @Binding var paymentRequest: PaymentRequest?
    let onStartNFC: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            // App logo/title
            VStack(spacing: 8) {
                Image(systemName: "creditcard.fill")
                    .font(.system(size: 60))
                    .foregroundColor(Color("gpayPrimary"))

                Text("Acme Pay")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(Color("textPrimary"))

                Text("Secure payments with PIX")
                    .font(.system(size: 16))
                    .foregroundColor(Color("textSecondary"))
            }

            Spacer()

            // Demo actions
            VStack(spacing: 16) {
                Button(action: {
                    paymentRequest = PaymentRequest.sample()
                    showPaymentSheet = true
                }) {
                    HStack {
                        Image(systemName: "qrcode")
                        Text("Demo Payment")
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color("gpayPrimary"))
                    .foregroundColor(.white)
                    .cornerRadius(25)
                }

                Button(action: onStartNFC) {
                    HStack {
                        Image(systemName: "wave.3.right")
                        Text("Scan NFC Tag")
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color("textSecondary").opacity(0.1))
                    .foregroundColor(Color("textPrimary"))
                    .cornerRadius(25)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 48)
        }
        .background(Color("gpayBackground"))
    }
}

// MARK: - NFC Delegate

class NFCDelegate: NSObject, NFCNDEFReaderSessionDelegate {
    private let onURL: (URL) -> Void

    init(onURL: @escaping (URL) -> Void) {
        self.onURL = onURL
    }

    func readerSession(_ session: NFCNDEFReaderSession, didDetectNDEFs messages: [NFCNDEFMessage]) {
        for message in messages {
            for record in message.records {
                if let url = record.wellKnownTypeURIPayload() {
                    DispatchQueue.main.async {
                        self.onURL(url)
                    }
                    return
                }
            }
        }
    }

    func readerSession(_ session: NFCNDEFReaderSession, didInvalidateWithError error: Error) {
        // Handle NFC session errors
        if let nfcError = error as? NFCReaderError,
           nfcError.code != .readerSessionInvalidationErrorUserCanceled {
            print("NFC Error: \(error.localizedDescription)")
        }
    }
}

#Preview {
    ContentView(
        showPaymentSheet: .constant(false),
        paymentRequest: .constant(nil),
        onStartNFC: {}
    )
}
