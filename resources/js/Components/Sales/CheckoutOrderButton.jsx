import React, { useState } from "react";
import { saveOrderLocal, saveOrderItemLocal, nextOrderNo } from "@/Utils/db";
import { paymentTotals } from "@/Utils/receipt";
import { useDeviceSync } from "@/Components/Devices/DeviceSyncProvider";
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
    const { printKitchenTicket, printBarSlip, autoPrintReceipt } = useDeviceSync();

    // finalizeCheckout now receives the paymentData object from modal
    const finalizeCheckout = async (paymentData) => {
        const orderId = crypto.randomUUID();
        const shiftId = localStorage.getItem("terminal_shift_id");
        const now = new Date().toISOString();

        try {
            // Shown on the kitchen ticket so the order can be called out.
            const orderNo = await nextOrderNo(shiftId);

            // Save order with payment details
            await saveOrderLocal({
                id: orderId,
                order_no: orderNo,
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
                    is_kitchen: !!item.is_kitchen,
                    is_bar: !!item.is_bar,
                });
            }

            // Printing must never get in the way of recording the sale.
            try {
                // Kitchen items only, to the kitchen device (if any are in the order).
                printKitchenTicket({ orderNo, items: cart, isUpdate: false });
                // Bar items, to the bar device, unless the person ringing is in the bar.
                printBarSlip({ orderNo, items: cart, isUpdate: false });
                // The customer's receipt, only if a manager turned auto-print on.
                autoPrintReceipt({
                    title: `Receipt #${orderNo}`,
                    date: new Date().toLocaleDateString(),
                    staff: auth.user.name,
                    customer: null,
                    items: cart,
                    totals: paymentTotals(cartTotal, paymentData),
                });
            } catch (printError) {
                console.error("Printing after sale failed:", printError);
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
