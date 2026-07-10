import React, { useState } from "react";
import CheckoutOrderButton from "@/Components/Sales/CheckoutOrderButton";
import CheckoutTableButton from "@/Components/Sales/CheckoutTableButton";
import { updateTableItemsLocal, closeTableLocal } from "@/Utils/db";
import PaymentSelectionModal from "@/Components/Sales/PaymentSelectionModal";
import toast from "react-hot-toast";

export default function TicketCart({
    cart,
    auth,
    setCart,
    activeTable,
    setActiveTable,
}) {
    // Calculate total
    const cartTotal = cart.reduce(
        (sum, item) => sum + (parseFloat(item.subtotal) || 0),
        0,
    );

    const clearCart = () => {
        setCart([]);
        setActiveTable(null);
    };

    const [showClosePayment, setShowClosePayment] = useState(false);

    const handleUpdateTable = async () => {
        if (!activeTable) return;
        try {
            await updateTableItemsLocal(activeTable.id, cart);
            toast.success("Table updated successfully!");
            clearCart(); // Clear the cart after a successful update
        } catch (e) {
            console.error(e);
            toast.error("Failed to update table");
        }
    };

    const handleCloseTable = async (method) => {
        try {
            await closeTableLocal(activeTable.id, method); // Pass the method
            toast.success("Table closed successfully!");
            setShowClosePayment(false);
            clearCart();
        } catch (e) {
            toast.error("Failed to close table");
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-white rounded-lg shadow border border-gray-100 p-4 overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-100 pb-3 mb-3 shrink-0">
                <h3 className="font-bold text-gray-800 text-base">
                    {activeTable
                        ? `Editing: ${activeTable.name}`
                        : "Current Ticket"}
                </h3>
                <p className="text-xs text-gray-400">
                    Operator: {auth.user.name}
                </p>
            </div>

            {/* Scrollable Cart Items */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <span className="text-sm">Ticket is empty</span>
                    </div>
                ) : (
                    cart.map((item) => (
                        <div
                            key={item.cartItemId}
                            className="flex justify-between items-start border-b border-gray-50 pb-2 gap-3"
                        >
                            <div className="flex flex-col">
                                <h5 className="text-sm font-semibold text-gray-800 line-clamp-2">
                                    {/* Display quantity and name correctly */}
                                    {item.quantity}x {item.name}
                                </h5>

                                {/* Display metadata if it exists and is not 'unit' */}
                                {item.metadata?.type &&
                                    item.metadata.type !== "unit" && (
                                        <span className="text-[10px] text-indigo-500 uppercase font-bold tracking-wider">
                                            ({item.metadata.type})
                                        </span>
                                    )}
                            </div>

                            <div className="text-sm font-bold text-gray-900 w-20 text-right">
                                ${parseFloat(item.subtotal || 0).toFixed(2)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Fixed Footer Actions */}
            <div className="border-t border-gray-100 pt-4 mt-3 space-y-3 shrink-0">
                <div className="flex justify-between items-center font-bold text-gray-800 text-lg">
                    <span>Total Due</span>
                    <span className="text-indigo-600">
                        ${cartTotal.toFixed(2)}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {/* Primary Actions */}
                    <CheckoutOrderButton
                        cart={cart}
                        auth={auth}
                        onClearCart={clearCart}
                    />
                    <CheckoutTableButton
                        cart={cart}
                        auth={auth}
                        onClearCart={clearCart}
                    />

                    {/* Table Management Actions */}
                    {activeTable ? (
                        <>
                            <button
                                onClick={handleUpdateTable}
                                className="bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition"
                            >
                                Update Table
                            </button>
                            <button
                                onClick={() => setShowClosePayment(true)}
                                className="bg-red-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-red-700 transition"
                            >
                                Close Table
                            </button>
                        </>
                    ) : (
                        <div className="col-span-2 text-center text-xs text-gray-400 py-3 italic">
                            Select a table to manage
                        </div>
                    )}

                </div>

                {/* Modal logic */}
                {showClosePayment && (
                    <PaymentSelectionModal
                        onSelect={handleCloseTable}
                        onCancel={() => setShowClosePayment(false)}
                    />
                )}
            </div>
            
        </div>
    );
}
