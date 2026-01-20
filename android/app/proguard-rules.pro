# Acme Pay ProGuard Rules

# Keep payment data classes
-keep class com.acme.pay.PaymentMethod { *; }
-keep class com.acme.pay.PaymentRequest { *; }
-keep class com.acme.pay.PaymentResult { *; }
-keep class com.acme.pay.PaymentResult$* { *; }

# Keep the activity that external apps call
-keep class com.acme.pay.PaymentActivity { *; }
