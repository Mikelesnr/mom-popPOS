// CheckoutTableButton.jsx
import React, { useState } from "react";
import { saveTableLocal, saveOrderItemLocal } from "@/Utils/db";
import toast from "react-hot-toast";

export default function CheckoutTableButton({ cart, auth, onClearCart }) {
    const [isNameModalOpen, setIsNameModalOpen] = useState(false);
    const [tableName, setTableName] = useState("");

    const cartTotal = cart.reduce(
        (sum, i) => sum + (parseFloat(i.subtotal) || 0),
        0,
    );

    const handleConfirmName = async () => {
        if (!tableName) return;
        setIsNameModalOpen(false);

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
                    metadata: item.metadata || { type: "unit" },
                });
            }

            onClearCart();
            setTableName(""); // Reset input
            toast.success(`Table "${tableName}" opened successfully!`);
        } catch (error) {
            toast.error("Failed to open table.");
        }
    };

    return (
        <>
            <button
                disabled={cart.length === 0}
                onClick={() => setIsNameModalOpen(true)}
                className="w-full bg-amber-600 text-white hover:bg-amber-700 font-bold py-3 px-4 rounded-xl transition-all shadow disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none text-sm md:text-base"
            >
                Open Table
            </button>

            {isNameModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
                        <h2 className="font-bold mb-4">Enter Table Name</h2>
                        <input
                            autoFocus
                            type="text"
                            value={tableName}
                            onChange={(e) => setTableName(e.target.value)}
                            className="w-full p-3 border rounded-xl mb-4 text-lg"
                            placeholder="e.g., Table 5"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsNameModalOpen(false)}
                                className="flex-1 py-3 bg-gray-200 rounded-xl font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmName}
                                className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
