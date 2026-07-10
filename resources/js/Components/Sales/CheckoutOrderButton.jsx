import React, { useState } from "react";
import { saveOrderLocal, saveOrderItemLocal } from "@/Utils/db";
import toast from "react-hot-toast";
import PaymentSelectionModal from "@/Components/Sales/PaymentSelectionModal"; // Import the shared modal

export default function CheckoutOrderButton({ cart, auth, onClearCart }) {
    const [showPayment, setShowPayment] = useState(false);
    const cartTotal = cart.reduce(
        (sum, i) => sum + (parseFloat(i.subtotal) || 0),
        0,
    );

    const finalizeCheckout = async (method) => {
        const orderId = crypto.randomUUID();
        const shiftId = localStorage.getItem("terminal_shift_id");
        const now = new Date().toISOString();

        try {
            await saveOrderLocal({
                id: orderId,
                shop_id: auth.user.shop_id,
                shift_id: shiftId,
                user_id: auth.user.id,
                total_amount: cartTotal,
                payment_method: method,
                status: "paid",
                created_at: now,
            });

            for (const item of cart) {
                await saveOrderItemLocal({
                    id: crypto.randomUUID(),
                    orderable_id: orderId,
                    product_id: item.product_id,
                    name: item.name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    subtotal: item.subtotal,
                    metadata: item.metadata || { type: "unit" },
                    synced_at: null,
                });
            }

            onClearCart();
            setShowPayment(false);
            toast.success("Sale completed successfully!");
        } catch (error) {
            toast.error("Failed to save order.");
        }
    };

    return (
        <>
            <button
                disabled={cart.length === 0}
                onClick={() => setShowPayment(true)}
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold py-3 px-4 rounded-xl transition-all shadow disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
            >
                Fast Sale (${cartTotal.toFixed(2)})
            </button>

            {/* Use the shared modal instead of hardcoded buttons */}
            {showPayment && (
                <PaymentSelectionModal
                    onSelect={finalizeCheckout}
                    onCancel={() => setShowPayment(false)}
                />
            )}
        </>
    );
}
