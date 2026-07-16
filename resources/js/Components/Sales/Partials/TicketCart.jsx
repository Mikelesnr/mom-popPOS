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
    // State to control which payment modal is open (or null)
    // Options: null, 'order' (Fast Sale), 'table' (Close Table)
    const [activePaymentContext, setActivePaymentContext] = useState(null);

    // --- CALCULATIONS ---
    const cartTotal = cart.reduce(
        (sum, item) => sum + (parseFloat(item.subtotal) || 0),
        0,
    );

    const clearCart = () => {
        setCart([]);
        setActiveTable(null);
        setActivePaymentContext(null);
    };

    // --- CRITICAL: IMMUTABILITY LOGIC RESTORED ---
    // Items loaded from Dexie (placed: 1) are read-only in the cart.
    const isItemImmutable = (item) => {
        return item.placed === 1;
    };

    // --- LOCAL CART MODIFICATION HANDLERS (Unplaced items only) ---
    const handleQtyChangeLocal = (cartItemId, delta) => {
        setCart((prevCart) =>
            prevCart.map((item) => {
                // ENFORCED: Only allow change if NOT immutable
                if (item.cartItemId === cartItemId && !isItemImmutable(item)) {
                    const newQty = Math.max(1, item.quantity + delta);
                    const newSubtotal = newQty * item.unit_price;
                    return { ...item, quantity: newQty, subtotal: newSubtotal };
                }
                return item;
            }),
        );
    };

    const handleRemoveItemLocal = (cartItemId) => {
        setCart((prevCart) =>
            prevCart.filter((item) => {
                // ENFORCED: Prevent removal if immutable
                if (item.cartItemId === cartItemId && isItemImmutable(item)) {
                    toast.error("Cannot remove item already sent to table.");
                    return true; // Keep item
                }
                return item.cartItemId !== cartItemId;
            }),
        );
    };

    // --- TABLE/ORDER ACTION HANDLERS ---

    // 1. Update Existing Table (Append new items marked as placed:0)
    const handleUpdateTable = async () => {
        if (!activeTable) return;
        try {
            const newItems = cart.filter((i) => i.placed === 0);

            if (newItems.length === 0) {
                toast("No new items to add to table.");
                return;
            }

            await updateTableItemsLocal(activeTable.id, newItems);
            toast.success("Table updated successfully!");
            clearCart();
        } catch (e) {
            console.error("Update Table Error:", e);
            toast.error("Failed to update table");
        }
    };

    // 2. Finalize "Close Table" (Triggered after payment modal confirms)
    const handleFinalCloseTable = async (paymentData) => {
        if (!activeTable) return;
        try {
            // Pass payment details (method, tendered, change) to db function
            await closeTableLocal(activeTable.id, paymentData, cartTotal);
            toast.success("Table closed and paid successfully!");
            clearCart();
        } catch (e) {
            console.error("Close Table Error:", e);
            toast.error("Failed to close table.");
        }
    };

    // --- RENDER HELPERS ---

    const renderItemControls = (item) => {
        const immutable = isItemImmutable(item);

        return (
            <div className="flex items-center gap-3 mt-1 sm:mt-0">
                {/* Quantity Adjusters - Hidden if immutable */}
                {!immutable && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() =>
                                handleQtyChangeLocal(item.cartItemId, -1)
                            }
                            className="text-red-500 font-bold p-2 disabled:opacity-50 hover:bg-red-50 rounded"
                            disabled={item.quantity <= 1}
                        >
                            -
                        </button>
                        <span className="font-bold text-lg w-8 text-center tabular-nums">
                            {item.quantity}
                        </span>
                        <button
                            onClick={() =>
                                handleQtyChangeLocal(item.cartItemId, 1)
                            }
                            className="text-green-500 font-bold p-2 hover:bg-green-50 rounded"
                        >
                            +
                        </button>
                    </div>
                )}

                {/* Immutable indicator OR Delete Button */}
                {immutable ? (
                    <span className="text-xs font-medium text-gray-400 italic w-16 text-right pr-1">
                        Sent
                    </span>
                ) : (
                    <button
                        onClick={() => handleRemoveItemLocal(item.cartItemId)}
                        className="text-red-500 hover:text-red-700 p-1 text-sm"
                    >
                        Remove
                    </button>
                )}
            </div>
        );
    };

    // Define base class for action buttons for consistency
    const actionBtnBase =
        "w-full text-white font-bold py-3 px-4 rounded-xl transition-all shadow disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none text-sm md:text-base";

    return (
        <div className="w-full h-full flex flex-col bg-white rounded-lg shadow border border-gray-100 p-4 overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-100 pb-3 mb-3 shrink-0 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-gray-800 text-base line-clamp-1">
                        {activeTable
                            ? `Editing: ${activeTable.name}`
                            : "Current Ticket"}
                    </h3>
                    <p className="text-xs text-gray-400">
                        Operator: {auth.user.name}
                    </p>
                </div>
                {activeTable && (
                    <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-3 py-1 rounded-full uppercase tracking-wider shrink-0 ml-2">
                        Open
                    </span>
                )}
            </div>

            {/* Scrollable Cart Items */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <span className="text-sm">Ticket is empty</span>
                    </div>
                ) : (
                    cart.map((item) => (
                        <div
                            key={item.cartItemId}
                            className="flex justify-between items-start border-b border-gray-50 pb-2 gap-3 hover:bg-gray-50 rounded px-1"
                        >
                            <div className="flex flex-col min-w-0 flex-1">
                                <h5 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">
                                    {item.name}
                                </h5>

                                {item.metadata?.type &&
                                    item.metadata.type !== "unit" && (
                                        <span className="text-[10px] text-indigo-500 uppercase font-bold tracking-wider mt-0.5">
                                            ({item.metadata.type})
                                        </span>
                                    )}
                            </div>

                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <div className="text-sm font-bold text-gray-900 w-24 text-right tabular-nums">
                                    ${parseFloat(item.subtotal || 0).toFixed(2)}
                                </div>
                                {/* Controls now check immutability */}
                                {renderItemControls(item)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Fixed Footer Actions */}
            <div className="border-t border-gray-100 pt-4 mt-3 space-y-3 shrink-0">
                <div className="flex justify-between items-center font-bold text-gray-800 text-lg md:text-xl">
                    <span>Total Due</span>
                    <span className="text-indigo-600 tabular-nums">
                        ${cartTotal.toFixed(2)}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* --- 1. FAST SALE (Order) Section --- */}
                    {/* CheckoutOrderButton handles its own modal for standalone orders */}
                    <CheckoutOrderButton
                        cart={cart}
                        auth={auth}
                        onClearCart={clearCart}
                        cartTotal={cartTotal} // Pass total for change calculation
                        className={`${actionBtnBase} bg-indigo-600 hover:bg-indigo-700`}
                    />

                    {/* --- 2. NEW TABLE Section --- */}
                    <CheckoutTableButton
                        cart={cart}
                        auth={auth}
                        onClearCart={clearCart}
                        className={`${actionBtnBase} bg-amber-600 hover:bg-amber-700`}
                    />

                    {/* --- 3. EXISTING TABLE Management Actions --- */}
                    {activeTable ? (
                        <>
                            {/* A. Update (Append new items marked as placed:0) */}
                            <button
                                onClick={handleUpdateTable}
                                className={`${actionBtnBase} bg-blue-600 hover:bg-blue-700`}
                            >
                                Update Table
                            </button>

                            {/* B. Close & Pay (Trigger modal for entire table total) */}
                            <button
                                onClick={() => setActivePaymentContext("table")}
                                className={`${actionBtnBase} bg-red-600 hover:bg-red-700`}
                            >
                                Close Table
                            </button>
                        </>
                    ) : (
                        <div className="col-span-2 text-center text-xs text-gray-400 py-3 italic bg-gray-50 rounded-lg">
                            Select or open a table to manage
                        </div>
                    )}
                </div>

                {/* --- PAYMENT MODAL LOGIC --- */}

                {/* Modal for Closing Table (requires confirmation to trigger db.js) */}
                {activePaymentContext === "table" && activeTable && (
                    <PaymentSelectionModal
                        totalAmount={cartTotal} // Uses cartTotal, which includes existing + new
                        onSelect={handleFinalCloseTable} // Calls handleFinalCloseTable below
                        onCancel={() => setActivePaymentContext(null)}
                    />
                )}
            </div>
        </div>
    );
}
