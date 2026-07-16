import React from "react";
import { saveTableLocal, saveOrderItemLocal } from "@/Utils/db";
import toast from "react-hot-toast";

export default function CheckoutTableButton({ cart, auth, onClearCart }) {
    const cartTotal = cart.reduce(
        (sum, i) => sum + (parseFloat(i.subtotal) || 0),
        0,
    );

    const checkoutTable = async () => {
        const tableName = prompt("Enter table name/number:");
        if (!tableName) return;

        const tableId = crypto.randomUUID();
        const shiftId = localStorage.getItem("terminal_shift_id");
        const now = new Date().toISOString();

        try {
            await saveTableLocal({
                id: tableId,
                shop_id: auth.user.shop_id,
                shift_id: shiftId,
                user_id: auth.user.id,
                name: tableName,
                total_amount: cartTotal,
                payment_method: null,
                status: "open",
                created_at: now,
            });

            for (const item of cart) {
                // saveOrderItemLocal will automatically set placed: 1
                await saveOrderItemLocal({
                    id: crypto.randomUUID(),
                    orderable_id: tableId,
                    product_id: item.product_id,
                    name: item.name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    subtotal: item.subtotal,
                    metadata: item.metadata || { type: "unit" },
                });
            }

            onClearCart();
            toast.success(`Table "${tableName}" opened locally.`);
        } catch (error) {
            console.error("Failed to open table:", error);
            toast.error("Failed to open table.");
        }
    };

    return (
        <button
            disabled={cart.length === 0}
            onClick={checkoutTable}
            className="w-full bg-amber-600 text-white hover:bg-amber-700 font-bold py-3 px-4 rounded-xl transition-all shadow disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none text-sm md:text-base"
        >
            Open Table
        </button>
    );
}
