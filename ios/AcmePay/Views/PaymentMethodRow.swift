import SwiftUI

/// Compact payment method row for alternative methods (cards, bank transfer)
struct PaymentMethodRow: View {
    let method: PaymentMethod
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 16) {
                // Payment method icon
                Image(method.iconName)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 40, height: 28)

                // Name and details
                VStack(alignment: .leading, spacing: 2) {
                    Text(method.name)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(Color("textPrimary"))

                    Text(method.details)
                        .font(.system(size: 13))
                        .foregroundColor(Color("textSecondary"))
                }

                Spacer()

                // Radio indicator
                Image(systemName: isSelected ? "circle.inset.filled" : "circle")
                    .font(.system(size: 22))
                    .foregroundColor(isSelected ? Color("gpayPrimary") : Color("textTertiary"))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.white)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(
                        isSelected ? Color("gpayPrimary") : Color("cardBorder"),
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    VStack(spacing: 12) {
        ForEach(PaymentMethod.alternatives()) { method in
            PaymentMethodRow(
                method: method,
                isSelected: method.id == "visa_4242",
                onSelect: {}
            )
        }
    }
    .padding()
    .background(Color("gpayBackground"))
}
