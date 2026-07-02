import React, { useState } from "react";
import { X } from "lucide-react"; // Assuming you use lucide-react for icons

export default function BottleOptionModal({
    product,
    shotSizes, // Array of [{ id: 'uuid', name: 'Single', size_ml: 30 }]
    onClose,
    onSelect, // The callback function addToCart(product, type, qty)
}) {
    const [customQty, setCustomQty] = useState("");

    // Helper to handle selection and close modal
    const handleSelection = (type, data) => {
        onSelect(product, type, data);
        onClose();
    };

    // Helper for keypad input
    const handleKeypad = (num) => {
        setCustomQty((prev) => prev + num);
    };

    const handleClearKeypad = () => {
        setCustomQty("");
    };

    const addCustomShots = () => {
        const qty = parseInt(customQty, 10);
        if (!isNaN(qty) && qty > 0) {
            handleSelection("custom_shots", qty);
        }
    };

    // Calculate price of a single shot for display purposes
    const singleShotObj = shotSizes.find((s) =>
        s.name.toLowerCase().includes("single"),
    );
    const capacity = product.bottle?.capacity_ml || 750;

    let singleDisplayPrice = 0.0;
    if (singleShotObj) {
        const ratio = singleShotObj.size_ml / capacity;
        singleDisplayPrice = (
            parseFloat(product.selling_price) *
            ratio *
            1.2
        ).toFixed(2);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 transform transition-all scale-95 animate-scale-up">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {product.name}
                        </h2>
                        <p className="text-sm text-gray-500">
                            Select Pour Size or Bottle
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Standard Pours & Bottle */}
                    <div className="md:col-span-2 grid grid-cols-2 gap-4 content-start">
                        {/* Dynamic Shot Sizes (Single/Double) */}
                        {shotSizes.map((shotSize) => {
                            const ratio = shotSize.size_ml / capacity;
                            // Use base product price for shot calculation
                            const calculatedPrice = Number(
                                (
                                    parseFloat(product.selling_price) *
                                    ratio *
                                    1.2
                                ).toFixed(2),
                            );

                            return (
                                <button
                                    key={shotSize.id}
                                    onClick={() =>
                                        handleSelection("shot", shotSize)
                                    }
                                    className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-6 bg-blue-50 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-100 rounded-xl transition-all active:scale-95 shadow-sm"
                                >
                                    <span className="text-3xl font-black text-blue-900">
                                        {shotSize.name}
                                    </span>
                                    <span className="text-sm font-medium text-blue-700 mt-1">
                                        {shotSize.size_ml} ml
                                    </span>
                                    <span className="text-lg font-bold text-blue-600 mt-3 bg-white px-3 py-1 rounded-full shadow-inner">
                                        ${calculatedPrice.toFixed(2)}
                                    </span>
                                </button>
                            );
                        })}

                        {/* Full Bottle Button */}
                        <button
                            onClick={() => handleSelection("bottle")}
                            className="col-span-2 flex flex-col items-center justify-center p-8 bg-amber-50 border-2 border-amber-300 hover:border-amber-500 hover:bg-amber-100 rounded-xl transition-all active:scale-95 shadow-sm"
                        >
                            <span className="text-4xl font-black text-amber-950">
                                FULL BOTTLE
                            </span>
                            <span className="text-sm font-medium text-amber-800 mt-1">
                                {capacity} ml
                            </span>
                            <span className="text-2xl font-extrabold text-amber-700 mt-3 bg-white px-6 py-2 rounded-full shadow-inner border border-amber-200">
                                $
                                {product.bottle?.bottle_selling_price
                                    ? parseFloat(
                                          product.bottle.bottle_selling_price,
                                      ).toFixed(2)
                                    : parseFloat(product.selling_price).toFixed(
                                          2,
                                      )}
                            </span>
                            {product.bottle?.bottle_selling_price && (
                                <span className="text-xs text-amber-600 mt-2 font-semibold">
                                    (Special Bottle Price Applied)
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Right Column: Custom Keypad */}
                    <div className="bg-gray-100 p-5 rounded-xl border border-gray-200 flex flex-col">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4 text-center">
                            Custom Shot Quantity
                        </h4>

                        {/* Display Input */}
                        <div className="bg-white p-4 rounded-lg text-right shadow-inner border border-gray-200 mb-4 min-h-[60px] flex items-center justify-end">
                            <span
                                className={`text-3xl font-bold ${customQty ? "text-gray-900" : "text-gray-300"}`}
                            >
                                {customQty || "0"}
                            </span>
                            <span className="text-sm text-gray-400 ml-2 self-end">
                                shots
                            </span>
                        </div>

                        {/* Keypad Grid */}
                        <div className="grid grid-cols-3 gap-2 flex-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handleKeypad(num.toString())}
                                    className="aspect-square bg-white rounded-lg flex items-center justify-center text-2xl font-bold text-gray-800 shadow hover:bg-gray-50 active:scale-95 border border-gray-200"
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                onClick={handleClearKeypad}
                                className="aspect-square bg-rose-100 text-rose-700 rounded-lg flex items-center justify-center text-2xl font-bold shadow hover:bg-rose-200 active:scale-95 border border-rose-200"
                            >
                                C
                            </button>
                            <button
                                onClick={() => handleKeypad("0")}
                                className="aspect-square bg-white rounded-lg flex items-center justify-center text-2xl font-bold text-gray-800 shadow hover:bg-gray-50 active:scale-95 border border-gray-200"
                            >
                                0
                            </button>
                            <button
                                onClick={addCustomShots}
                                disabled={
                                    !customQty || parseInt(customQty, 10) <= 0
                                }
                                className="aspect-square bg-emerald-500 text-white rounded-lg flex items-center justify-center text-xl font-bold shadow hover:bg-emerald-600 active:scale-95 disabled:bg-gray-300 disabled:text-gray-500"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
