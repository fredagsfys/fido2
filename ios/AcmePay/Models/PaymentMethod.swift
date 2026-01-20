import Foundation

/// Represents a payment method in the payment sheet
struct PaymentMethod: Identifiable, Equatable {
    let id: String
    let type: PaymentType
    let name: String
    let details: String
    let iconName: String
    let isDefault: Bool
    let isFeatured: Bool
    let balance: Int?  // Balance in cents

    enum PaymentType: String, CaseIterable {
        case pix
        case card
        case bankTransfer
        case klarna
    }

    init(
        id: String,
        type: PaymentType,
        name: String,
        details: String,
        iconName: String,
        isDefault: Bool = false,
        isFeatured: Bool = false,
        balance: Int? = nil
    ) {
        self.id = id
        self.type = type
        self.name = name
        self.details = details
        self.iconName = iconName
        self.isDefault = isDefault
        self.isFeatured = isFeatured
        self.balance = balance
    }

    /// Format balance for display (Brazilian Real)
    var formattedBalance: String? {
        guard let balance = balance else { return nil }
        let value = Double(balance) / 100.0
        let formatted = String(format: "%.2f", value).replacingOccurrences(of: ".", with: ",")
        return "R$ \(formatted) available"
    }

    /// Get default payment methods with PIX as featured
    static func defaultMethods() -> [PaymentMethod] {
        [
            // PIX is the featured default option
            PaymentMethod(
                id: "pix_acme",
                type: .pix,
                name: "Pix",
                details: "by Acme Pay \u{2022} Instant",
                iconName: "ic_pix",
                isDefault: true,
                isFeatured: true,
                balance: 125000  // R$ 1.250,00
            ),
            // Alternative payment methods
            PaymentMethod(
                id: "visa_4242",
                type: .card,
                name: "Visa",
                details: "\u{2022}\u{2022}\u{2022}\u{2022} 4242",
                iconName: "ic_visa"
            ),
            PaymentMethod(
                id: "mc_5555",
                type: .card,
                name: "Mastercard",
                details: "\u{2022}\u{2022}\u{2022}\u{2022} 5555",
                iconName: "ic_mastercard"
            )
        ]
    }

    /// Get the featured payment method (PIX)
    static func featured() -> PaymentMethod? {
        defaultMethods().first { $0.isFeatured }
    }

    /// Get alternative (non-featured) payment methods
    static func alternatives() -> [PaymentMethod] {
        defaultMethods().filter { !$0.isFeatured }
    }
}
