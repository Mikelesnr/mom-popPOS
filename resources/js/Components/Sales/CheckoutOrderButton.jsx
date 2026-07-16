import React, { useState } from "react";
import { saveOrderLocal, saveOrderItemLocal } from "@/Utils/db";
import toast from "react-hot-toast";
import PaymentSelectionModal from "@/Components/Sales/PaymentSelectionModal";

// Accept cartTotal as prop
export default function CheckoutOrderButton({
    cart,
    auth,
    onClearCart,
    cartTotal,
}) {
    const [showPayment, setShowPayment] = useState(false);

    // finalizeCheckout now receives the paymentData object from modal
    const finalizeCheckout = async (paymentData) => {
        const orderId = crypto.randomUUID();
        const shiftId = localStorage.getItem("terminal_shift_id");
        const now = new Date().toISOString();

        try {
            // Save order with payment details
            await saveOrderLocal({
                id: orderId,
                shop_id: auth.user.shop_id,
                shift_id: shiftId,
                user_id: auth.user.id,
                total_amount: cartTotal,
                // Map the new payment data structure
                payment_method: paymentData.method,
                amount_tendered: paymentData.amount_tendered,
                change_due: paymentData.change_due,
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
                });
            }

            onClearCart();
            setShowPayment(false);

            // Optional: Show receipt/change toast
            if (paymentData.method === "cash" && paymentData.change_due > 0) {
                toast.success(
                    `Sale complete. Change: $${paymentData.change_due.toFixed(2)}`,
                    { duration: 5000 },
                );
            } else {
                toast.success("Sale completed successfully!");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to save order.");
        }
    };

    return (
        <>
            <button
                disabled={cart.length === 0}
                onClick={() => setShowPayment(true)}
                // Assuming you have classes defined in parent or TicketCart
                className={/* Your Button Classes */ "w-full ..."}
            >
                Fast Sale (${cartTotal.toFixed(2)})
            </button>

            {showPayment && (
                <PaymentSelectionModal
                    totalAmount={cartTotal} // Pass total to modal
                    onSelect={finalizeCheckout}
                    onCancel={() => setShowPayment(false)}
                />
            )}
        </>
    );
}
