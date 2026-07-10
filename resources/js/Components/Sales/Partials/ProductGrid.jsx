// ProductGrid.jsx
import React, { useState } from "react";
import BottleOptionModal from "@/Components/Sales/Partials/BottleOptionModal";
import { NumericKeypad } from "@/Components/Shared/NumericKeypad"; // Update path as needed

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
        if (product.bottle_specs) {
            setSelectedProduct(product);
            setIsModalOpen(true);
        } else {
            // Instead of prompt, open the keypad
            setSelectedProduct(product);
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
            <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 p-1 select-none content-start">
                {filteredProducts.map((product) => (
                    <button
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                        className={`... ${activeColorClass}`}
                    >
                        {product.name}
                    </button>
                ))}
            </div>

            {/* Existing Bottle Modal */}
            {isModalOpen && selectedProduct && (
                <BottleOptionModal
                    product={selectedProduct}
                    onClose={() => setIsModalOpen(false)}
                    onSelect={addToCart}
                />
            )}

            {/* New Unit Keypad Modal */}
            {isKeypadOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
                        <h2 className="font-bold mb-4 text-center">
                            Quantity for {selectedProduct.name}
                        </h2>
                        <NumericKeypad onConfirm={handleUnitConfirm} />
                        <button
                            onClick={() => setIsKeypadOpen(false)}
                            className="w-full mt-2 text-gray-500 text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
