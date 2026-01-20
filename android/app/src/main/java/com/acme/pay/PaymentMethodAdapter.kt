package com.acme.pay

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.acme.pay.databinding.ItemPaymentMethodBinding

/**
 * RecyclerView adapter for payment methods list
 */
class PaymentMethodAdapter(
    private val onMethodSelected: (PaymentMethod) -> Unit
) : ListAdapter<PaymentMethod, PaymentMethodAdapter.ViewHolder>(DIFF_CALLBACK) {

    private var selectedId: String? = null

    fun setSelectedMethod(id: String?) {
        val oldId = selectedId
        selectedId = id

        // Update only changed items
        currentList.forEachIndexed { index, method ->
            if (method.id == oldId || method.id == id) {
                notifyItemChanged(index)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemPaymentMethodBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position), selectedId)
    }

    inner class ViewHolder(
        private val binding: ItemPaymentMethodBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        init {
            binding.root.setOnClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    val method = getItem(position)
                    onMethodSelected(method)
                }
            }
        }

        fun bind(method: PaymentMethod, selectedId: String?) {
            val isSelected = method.id == selectedId

            binding.apply {
                paymentIcon.setImageResource(method.iconRes)
                paymentMethodName.text = method.name
                paymentMethodDetails.text = method.details

                // Update selection state
                radioButton.setImageResource(
                    if (isSelected) R.drawable.ic_radio_checked
                    else R.drawable.ic_radio_unchecked
                )
                paymentMethodCard.isSelected = isSelected
            }
        }
    }

    companion object {
        private val DIFF_CALLBACK = object : DiffUtil.ItemCallback<PaymentMethod>() {
            override fun areItemsTheSame(oldItem: PaymentMethod, newItem: PaymentMethod) =
                oldItem.id == newItem.id

            override fun areContentsTheSame(oldItem: PaymentMethod, newItem: PaymentMethod) =
                oldItem == newItem
        }
    }
}
