package com.acme.pay

import android.app.Dialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.recyclerview.widget.LinearLayoutManager
import com.acme.pay.databinding.FragmentPaymentBottomSheetBinding
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.bottomsheet.BottomSheetDialogFragment

/**
 * Google Pay-style bottom sheet for payment selection.
 * Features PIX as the default prominent option with cards as alternatives.
 */
class PaymentBottomSheetFragment : BottomSheetDialogFragment() {

    private var _binding: FragmentPaymentBottomSheetBinding? = null
    private val binding get() = _binding!!

    private lateinit var adapter: PaymentMethodAdapter
    private lateinit var biometricHelper: BiometricHelper

    private var paymentRequest: PaymentRequest? = null
    private var selectedMethod: PaymentMethod? = null
    private var paymentListener: PaymentListener? = null
    private var paymentHandled = false  // Prevent double callbacks

    interface PaymentListener {
        fun onPaymentSuccess(result: PaymentResult.Success)
        fun onPaymentError(result: PaymentResult.Error)
        fun onPaymentCancelled()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        arguments?.let { args ->
            paymentRequest = PaymentRequest(
                amount = args.getLong(PaymentRequest.EXTRA_AMOUNT, 0),
                currency = args.getString(PaymentRequest.EXTRA_CURRENCY, "BRL"),
                merchantName = args.getString(PaymentRequest.EXTRA_MERCHANT_NAME, "Merchant"),
                merchantId = args.getString(PaymentRequest.EXTRA_MERCHANT_ID),
                orderId = args.getString(PaymentRequest.EXTRA_ORDER_ID),
                description = args.getString(PaymentRequest.EXTRA_DESCRIPTION)
            )
        }

        biometricHelper = BiometricHelper(this)
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val dialog = super.onCreateDialog(savedInstanceState) as BottomSheetDialog

        dialog.setOnShowListener { dialogInterface ->
            val bottomSheet = (dialogInterface as BottomSheetDialog)
                .findViewById<FrameLayout>(com.google.android.material.R.id.design_bottom_sheet)

            bottomSheet?.let { sheet ->
                val behavior = BottomSheetBehavior.from(sheet)
                behavior.state = BottomSheetBehavior.STATE_EXPANDED
                behavior.skipCollapsed = true
                behavior.isDraggable = true
                sheet.setBackgroundResource(android.R.color.transparent)

                behavior.addBottomSheetCallback(object : BottomSheetBehavior.BottomSheetCallback() {
                    override fun onStateChanged(bottomSheet: View, newState: Int) {
                        if (newState == BottomSheetBehavior.STATE_HIDDEN) {
                            dismiss()  // onDismiss will handle the callback
                        }
                    }
                    override fun onSlide(bottomSheet: View, slideOffset: Float) {}
                })
            }
        }

        return dialog
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentPaymentBottomSheetBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupUI()
        setupAlternativePayments()  // Must be before setupFeaturedPayment
        setupFeaturedPayment()
        setupClickListeners()
    }

    private fun setupUI() {
        paymentRequest?.let { request ->
            binding.merchantName.text = request.merchantName
            binding.totalAmount.text = request.formatAmount()
        }
    }

    private fun setupFeaturedPayment() {
        val featured = PaymentMethod.getFeatured() ?: return

        binding.featuredIcon.setImageResource(featured.iconRes)
        binding.featuredName.text = featured.name
        binding.featuredDetails.text = featured.details

        // Show balance if available
        featured.formatBalance()?.let { balance ->
            binding.featuredBalance.text = balance
            binding.featuredBalance.visibility = android.view.View.VISIBLE
        } ?: run {
            binding.featuredBalance.visibility = android.view.View.GONE
        }

        // Select featured by default
        selectPaymentMethod(featured)

        binding.featuredPaymentMethod.setOnClickListener {
            selectPaymentMethod(featured)
        }
    }

    private fun setupAlternativePayments() {
        adapter = PaymentMethodAdapter { method ->
            selectPaymentMethod(method)
        }

        binding.paymentMethodsList.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = this@PaymentBottomSheetFragment.adapter
            itemAnimator = null
        }

        // Only show alternative (non-featured) methods
        adapter.submitList(PaymentMethod.getAlternatives())
    }

    private fun selectPaymentMethod(method: PaymentMethod) {
        selectedMethod = method

        // Update featured selection state
        val featured = PaymentMethod.getFeatured()
        val isFeaturedSelected = method.id == featured?.id

        binding.featuredPaymentMethod.isSelected = isFeaturedSelected
        binding.featuredRadio.setImageResource(
            if (isFeaturedSelected) R.drawable.ic_radio_checked else R.drawable.ic_radio_unchecked
        )

        // Update alternatives selection
        if (!isFeaturedSelected) {
            adapter.setSelectedMethod(method.id)
        } else {
            adapter.setSelectedMethod(null)
        }

        // Update button
        binding.payButton.text = "Pay with ${method.name}"
    }

    private fun setupClickListeners() {
        binding.payButton.setOnClickListener {
            initiatePayment()
        }
    }

    private fun initiatePayment() {
        val method = selectedMethod ?: return
        val request = paymentRequest ?: return

        binding.payButton.isEnabled = false
        binding.payButton.text = getString(R.string.authenticating)

        if (biometricHelper.canAuthenticate()) {
            biometricHelper.authenticate(
                amount = request.formatAmount(),
                onSuccess = { processPayment(method) },
                onError = { _, message ->
                    showError(message)
                    resetButton()
                },
                onCancelled = { resetButton() }
            )
        } else {
            processPayment(method)
        }
    }

    private fun processPayment(method: PaymentMethod) {
        binding.payButton.postDelayed({
            animateSuccess {
                paymentHandled = true
                val result = PaymentResult.Success(
                    transactionId = "txn_${System.currentTimeMillis()}",
                    paymentMethodId = method.id
                )
                paymentListener?.onPaymentSuccess(result)
                dismiss()
            }
        }, 500)
    }

    private fun animateSuccess(onComplete: () -> Unit) {
        binding.payButton.apply {
            setBackgroundColor(resources.getColor(R.color.gpay_success, null))
            setIconResource(R.drawable.ic_check_circle)
            text = getString(R.string.payment_successful)
            iconTint = null

            animate()
                .scaleX(1.02f)
                .scaleY(1.02f)
                .setDuration(150)
                .withEndAction {
                    animate()
                        .scaleX(1f)
                        .scaleY(1f)
                        .setDuration(150)
                        .withEndAction { postDelayed(onComplete, 500) }
                        .start()
                }
                .start()
        }
    }

    private fun showError(message: String) {
        binding.payButton.apply {
            val originalText = text
            setBackgroundColor(resources.getColor(R.color.gpay_error, null))
            text = message
            postDelayed({
                setBackgroundColor(resources.getColor(R.color.gpay_primary, null))
                text = originalText
            }, 2000)
        }
    }

    private fun resetButton() {
        binding.payButton.apply {
            isEnabled = true
            selectedMethod?.let { text = "Pay with ${it.name}" }
        }
    }

    fun setPaymentListener(listener: PaymentListener) {
        this.paymentListener = listener
    }

    override fun onDismiss(dialog: android.content.DialogInterface) {
        super.onDismiss(dialog)
        // Ensure activity finishes when bottom sheet is dismissed (if not already handled)
        if (!paymentHandled) {
            paymentListener?.onPaymentCancelled()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        biometricHelper.cancelAuthentication()
        _binding = null
    }

    companion object {
        const val TAG = "PaymentBottomSheet"

        fun newInstance(request: PaymentRequest): PaymentBottomSheetFragment {
            return PaymentBottomSheetFragment().apply {
                arguments = Bundle().apply {
                    putLong(PaymentRequest.EXTRA_AMOUNT, request.amount)
                    putString(PaymentRequest.EXTRA_CURRENCY, request.currency)
                    putString(PaymentRequest.EXTRA_MERCHANT_NAME, request.merchantName)
                    putString(PaymentRequest.EXTRA_MERCHANT_ID, request.merchantId)
                    putString(PaymentRequest.EXTRA_ORDER_ID, request.orderId)
                    putString(PaymentRequest.EXTRA_DESCRIPTION, request.description)
                }
            }
        }
    }
}
