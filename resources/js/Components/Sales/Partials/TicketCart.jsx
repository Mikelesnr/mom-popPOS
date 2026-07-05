import React from "react";

export default function TicketCart({ cart, auth }) {
    // Calculate total due by summing totalLinePrice of all items
    const cartTotal = cart.reduce((sum, item) => {
        const lineTotal = parseFloat(item.totalLinePrice) || 0;
        return sum + lineTotal;
    }, 0);

    return (
        <div className="w-full md:w-1/3 flex flex-col bg-white rounded-lg shadow border border-gray-100 p-4">
            <div className="border-b border-gray-100 pb-3 mb-3">
                <h3 className="font-bold text-gray-800 text-base">
                    Current Ticket
                </h3>
                <p className="text-xs text-gray-400">
                    Operator Session: {auth.user.name} ({auth.user.role})
                </p>
            </div>

            {/* Current Order Stream Container (Itemized List) */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                        <span className="text-sm">Ticket is empty</span>
                    </div>
                ) : (
                    cart.map((item) => (
                        <div
                            key={item.cartId}
                            className="flex justify-between items-start border-b border-gray-50 pb-2 gap-3"
                        >
                            {/* Item Name (Takes most space) */}
                            <div className="flex-1">
                                <h5 className="font-medium text-gray-800 text-xs sm:text-sm line-clamp-2">
                                    {item.name}
                                </h5>
                                {/* Optional: Show the exact volumetric deduction if helpful for audit, 
                                    e.g., "Deduction: 0.040 L" */}
                                {item.baseData?.type === "shot" && (
                                    <span className="text-[10px] text-gray-400 font-mono">
                                        ({(item.quantity * 1000).toFixed(0)} ml)
                                    </span>
                                )}
                            </div>

                            {/* Quantity/Unit (Obsolete in itemized view, but keeping space for clarity if needed) */}
                            {/* <div className="flex items-center gap-2 w-8 text-center">
                                <span className="text-sm font-semibold text-gray-700">
                                    {Number.isInteger(item.quantity)
                                        ? item.quantity
                                        : item.quantity.toFixed(3)}
                                </span>
                            </div> */}

                            {/* Line Total Price (Prominent display on right) */}
                            <div className="text-sm font-bold text-gray-900 w-16 text-right">
                                ${item.totalLinePrice.toFixed(2)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Invoice Total Processing Footer */}
            <div className="border-t border-gray-100 pt-4 mt-3 space-y-3">
                <div className="flex justify-between items-center font-bold text-gray-800 text-lg">
                    <span>Total Due</span>
                    <span className="text-indigo-600">
                        ${cartTotal.toFixed(2)}
                    </span>
                </div>

                <button
                    disabled={cart.length === 0}
                    onClick={() => alert("Processing transaction pipeline...")}
                    className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold py-3 px-4 rounded-xl transition-all shadow disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                >
                    Post Sale & Print
                </button>
            </div>
        </div>
    );
}
