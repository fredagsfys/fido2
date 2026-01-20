package com.acme.pay

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment

/**
 * Helper class for biometric authentication
 */
class BiometricHelper(private val fragment: Fragment) {

    private var biometricPrompt: BiometricPrompt? = null

    /**
     * Check if biometric authentication is available
     */
    fun canAuthenticate(): Boolean {
        val biometricManager = BiometricManager.from(fragment.requireContext())
        return when (biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG or
            BiometricManager.Authenticators.BIOMETRIC_WEAK
        )) {
            BiometricManager.BIOMETRIC_SUCCESS -> true
            else -> false
        }
    }

    /**
     * Show biometric prompt for payment authentication
     */
    fun authenticate(
        amount: String,
        onSuccess: () -> Unit,
        onError: (Int, String) -> Unit,
        onCancelled: () -> Unit
    ) {
        val executor = ContextCompat.getMainExecutor(fragment.requireContext())

        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                super.onAuthenticationSucceeded(result)
                onSuccess()
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                super.onAuthenticationError(errorCode, errString)
                when (errorCode) {
                    BiometricPrompt.ERROR_USER_CANCELED,
                    BiometricPrompt.ERROR_NEGATIVE_BUTTON,
                    BiometricPrompt.ERROR_CANCELED -> onCancelled()
                    else -> onError(errorCode, errString.toString())
                }
            }

            override fun onAuthenticationFailed() {
                super.onAuthenticationFailed()
                // Don't call onError here - the system will retry automatically
            }
        }

        biometricPrompt = BiometricPrompt(fragment, executor, callback)

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(fragment.getString(R.string.biometric_prompt_title))
            .setSubtitle("Pay $amount")
            .setNegativeButtonText(fragment.getString(R.string.biometric_prompt_negative))
            .setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_STRONG or
                BiometricManager.Authenticators.BIOMETRIC_WEAK
            )
            .build()

        biometricPrompt?.authenticate(promptInfo)
    }

    /**
     * Cancel ongoing authentication
     */
    fun cancelAuthentication() {
        biometricPrompt?.cancelAuthentication()
    }
}
