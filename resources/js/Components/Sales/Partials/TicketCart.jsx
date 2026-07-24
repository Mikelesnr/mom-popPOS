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
    onPrint,
}) {
    const [activePaymentContext, setActivePaymentContext] = useState(null);

    const cartTotal = cart.reduce(
        (sum, item) => sum + (parseFloat(item.subtotal) || 0),
        0,
    );

    const clearCart = () => {
        setCart([]);
        setActiveTable(null);
        setActivePaymentContext(null);
    };

    const handleQtyChangeLocal = (cartItemId, delta) => {
        setCart((prevCart) =>
            prevCart.map((item) => {
                if (item.cartItemId === cartItemId && item.placed !== 1) {
                    const newQty = Math.max(1, item.quantity + delta);
                    const newSubtotal = newQty * item.unit_price;
                    return { ...item, quantity: newQty, subtotal: newSubtotal };
                }
                return item;
            }),
        );
    };

    const handleRemoveItemLocal = (cartItemId) => {
        setCart((prev) =>
            prev.filter((i) => i.cartItemId !== cartItemId || i.placed === 1),
        );
    };

    const handleUpdateTable = async () => {
        if (!activeTable) return;
        const newItems = cart.filter((i) => i.placed === 0);

        if (newItems.length === 0) {
            clearCart();
            return;
        }

        try {
            await updateTableItemsLocal(activeTable.id, newItems);
            toast.success("Table updated successfully!");
            clearCart();
        } catch (e) {
            toast.error("Failed to update table");
        }
    };

    const handleFinalCloseTable = async (paymentData) => {
        if (!activeTable) return;
        try {
            await closeTableLocal(activeTable.id, paymentData, cartTotal);
            toast.success("Table closed and paid successfully!");
            clearCart();
        } catch (e) {
            toast.error("Failed to close table.");
        }
    };

    const actionBtnBase =
        "w-full text-white font-black py-4 px-4 rounded-xl transition-all shadow-md text-sm md:text-base";

    return (
        <div className="w-full h-full flex flex-col bg-white rounded-lg shadow border border-gray-100 p-4 overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-200 pb-4 mb-4 flex justify-between items-center shrink-0">
                <h3 className="font-black text-gray-900 text-lg">
                    {activeTable
                        ? `Editing: ${activeTable.name}`
                        : "Current Ticket"}
                </h3>
                {(activeTable || cart.length > 0) && (
                    <button
                        onClick={onPrint}
                        className="text-xs text-indigo-600 font-bold underline"
                    >
                        Print
                    </button>
                )}
            </div>

            {/* Scrollable Cart Items */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {cart.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400 font-medium">
                        Ticket is empty
                    </div>
                ) : (
                    cart.map((item) => (
                        <div
                            key={item.cartItemId}
                            className="border-b border-gray-100 pb-3"
                        >
                            <div className="flex justify-between items-center mb-1">
                                <h5 className="text-base font-extrabold text-gray-950">
                                    {item.name}
                                </h5>
                                <span className="text-base font-black text-gray-950 tabular-nums">
                                    ${parseFloat(item.subtotal || 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <div className="flex gap-2 items-center">
                                    <span className="font-black text-lg text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                                        {item.quantity}x
                                    </span>
                                    {item.metadata?.type && (
                                        <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                                            {item.metadata.type}
                                        </span>
                                    )}
                                </div>
                                {item.placed === 1 ? (
                                    <span className="text-xs font-bold text-gray-500 italic">
                                        Sent
                                    </span>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() =>
                                                handleQtyChangeLocal(
                                                    item.cartItemId,
                                                    -1,
                                                )
                                            }
                                            className="text-red-600 font-black p-2"
                                        >
                                            -
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleRemoveItemLocal(
                                                    item.cartItemId,
                                                )
                                            }
                                            className="text-red-500 font-bold text-sm"
                                        >
                                            Remove
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleQtyChangeLocal(
                                                    item.cartItemId,
                                                    1,
                                                )
                                            }
                                            className="text-green-600 font-black p-2"
                                        >
                                            +
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Starts Here */}
            <div className="border-t border-gray-200 pt-4 mt-3 space-y-4 shrink-0">
                <div className="flex justify-between items-center font-black text-gray-950 text-2xl">
                    <span>Total</span>
                    <span className="text-indigo-600 tabular-nums">
                        ${cartTotal.toFixed(2)}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* FIXED: Only show Fast Sale if no table is active */}
                    {!activeTable && (
                        <CheckoutOrderButton
                            cart={cart}
                            auth={auth}
                            onClearCart={clearCart}
                            cartTotal={cartTotal}
                            className={`${actionBtnBase} bg-indigo-600 hover:bg-indigo-700`}
                        />
                    )}
                    <CheckoutTableButton
                        cart={cart}
                        auth={auth}
                        onClearCart={clearCart}
                        className={`${actionBtnBase} bg-amber-600 hover:bg-amber-700`}
                    />

                    {activeTable && (
                        <>
                            <button
                                onClick={handleUpdateTable}
                                className={`${actionBtnBase} bg-blue-600 hover:bg-blue-700`}
                            >
                                Update Table
                            </button>
                            <button
                                onClick={() => setActivePaymentContext("table")}
                                className={`${actionBtnBase} bg-red-600 hover:bg-red-700`}
                            >
                                Close Table
                            </button>
                        </>
                    )}
                </div>

                {/* Modal logic is placed here inside the footer container */}
                {activePaymentContext === "table" && activeTable && (
                    <PaymentSelectionModal
                        totalAmount={cartTotal}
                        onSelect={handleFinalCloseTable}
                        onCancel={() => setActivePaymentContext(null)}
                    />
                )}
            </div>
            {/* Footer Ends Here */}
        </div>
    );
}
