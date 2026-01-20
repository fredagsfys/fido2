import SwiftUI

/// Featured payment method card (PIX) with prominent display
struct FeaturedPaymentView: View {
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
                    .frame(width: 48, height: 32)

                // Name, details, and balance
                VStack(alignment: .leading, spacing: 2) {
                    Text(method.name)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(Color("textPrimary"))

                    Text(method.details)
                        .font(.system(size: 13))
                        .foregroundColor(Color("textSecondary"))

                    if let balance = method.formattedBalance {
                        Text(balance)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(Color("pixTeal"))
                            .padding(.top, 2)
                    }
                }

                Spacer()

                // Radio indicator
                Image(systemName: isSelected ? "circle.inset.filled" : "circle")
                    .font(.system(size: 24))
                    .foregroundColor(isSelected ? Color("gpayPrimary") : Color("textTertiary"))
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(
                        isSelected ? Color("pixTeal") : Color("cardBorder"),
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    VStack(spacing: 16) {
        FeaturedPaymentView(
            method: PaymentMethod.featured()!,
            isSelected: true,
            onSelect: {}
        )

        FeaturedPaymentView(
            method: PaymentMethod.featured()!,
            isSelected: false,
            onSelect: {}
        )
    }
    .padding()
    .background(Color("gpayBackground"))
}
