// ProductGrid.jsx
import React, { useState } from "react";
import BottleOptionModal from "@/Components/Sales/Partials/BottleOptionModal";
import { NumericKeypad } from "@/Components/Shared/NumericKeypad";

export default function ProductGrid({
    filteredProducts,
    shotSizes,
    addToCart,
    activeColorClass,
}) {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isKeypadOpen, setIsKeypadOpen] = useState(false);

    const handleProductClick = (product) => {
        setSelectedProduct(product);
        if (product.bottle_specs) {
            setIsModalOpen(true);
        } else {
            setIsKeypadOpen(true);
        }
    };

    const handleUnitConfirm = (qty) => {
        if (qty > 0) {
            addToCart(selectedProduct, { type: "unit" }, qty);
        }
        setIsKeypadOpen(false);
    };

    return (
        <>
            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-3 select-none content-start">
                {filteredProducts.map((product, index) => {
                    const isEven = index % 2 === 0;

                    return (
                        <button
                            key={product.id}
                            onClick={() => handleProductClick(product)}
                            className={`h-28 p-3 rounded-2xl text-base sm:text-lg font-bold leading-snug transition-all flex flex-col items-center justify-center text-center break-words shadow-sm border-2 ${
                                isEven
                                    ? "bg-indigo-50 text-indigo-900 border-indigo-100 hover:bg-indigo-100 active:bg-indigo-200"
                                    : "bg-emerald-50 text-emerald-900 border-emerald-100 hover:bg-emerald-100 active:bg-emerald-200"
                            }`}
                        >
                            {product.name}
                        </button>
                    );
                })}
            </div>

            {/* Bottle Option Modal for spirits */}
            {isModalOpen && (
                <BottleOptionModal
                    product={selectedProduct}
                    onClose={() => setIsModalOpen(false)}
                    onSelect={addToCart}
                />
            )}

            {/* Standard Unit Keypad Modal */}
            {isKeypadOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 w-full max-w-sm">
                        <h2 className="font-bold text-lg text-gray-900 mb-4 text-center">
                            Quantity for {selectedProduct?.name}
                        </h2>
                        <NumericKeypad onConfirm={handleUnitConfirm} />
                        <button
                            onClick={() => setIsKeypadOpen(false)}
                            className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
