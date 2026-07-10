import React from "react";
import { saveTableLocal, saveOrderItemLocal } from "@/Utils/db";

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
            await saveOrderItemLocal({
                id: crypto.randomUUID(),
                orderable_id: tableId,
                product_id: item.product_id,
                name: item.name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                subtotal: item.subtotal,
                // PASS AS OBJECT:
                metadata: item.metadata || { type: "unit" },
                synced_at: null,
            });
        }

        onClearCart();
        alert(`Table "${tableName}" opened locally.`);
    };

    return (
        <button
            disabled={cart.length === 0}
            onClick={checkoutTable}
            className="w-full bg-amber-600 text-white hover:bg-amber-700 font-bold py-3 px-4 rounded-xl transition-all shadow disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
        >
            Open Table
        </button>
    );
}
