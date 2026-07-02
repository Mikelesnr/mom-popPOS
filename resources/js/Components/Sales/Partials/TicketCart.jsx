import React from "react";

export default function TicketCart({ cart, updateQuantity, auth }) {
    const cartTotal = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
    );

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

            {/* Current Order Stream Container */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                        <span className="text-sm">Ticket is empty</span>
                    </div>
                ) : (
                    cart.map((item) => (
                        <div
                            key={item.cartId}
                            className="flex justify-between items-start border-b border-gray-50 pb-2"
                        >
                            <div className="max-w-[65%]">
                                <h5 className="font-medium text-gray-800 text-xs sm:text-sm line-clamp-2">
                                    {item.name}
                                </h5>
                                <p className="text-xs text-gray-400">
                                    ${item.price.toFixed(2)} each
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() =>
                                        updateQuantity(item.cartId, -1)
                                    }
                                    className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs flex items-center justify-center"
                                >
                                    -
                                </button>
                                <span className="text-sm font-semibold text-gray-700 w-4 text-center">
                                    {item.quantity}
                                </span>
                                <button
                                    onClick={() =>
                                        updateQuantity(item.cartId, 1)
                                    }
                                    className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs flex items-center justify-center"
                                >
                                    +
                                </button>
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
