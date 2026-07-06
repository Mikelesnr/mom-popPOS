import React, { useState } from "react";
import BottleOptionModal from "@/Components/Sales/Partials/BottleOptionModal";
import { Product, ShotSize } from "@/Utils/contracts.js";

export default function ProductGrid({
    filteredProducts,
    shotSizes,
    addToCart,
    activeColorClass,
}) {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleProductClick = (product) => {
        if (product.bottle_specs) {
            setSelectedProduct(product);
            setIsModalOpen(true);
        } else {
            addToCart(product, "unit", 1);
        }
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
                        {product.bottle_specs && (
                            <span className="block text-[9px] opacity-70">
                                SPIRIT
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {isModalOpen && selectedProduct && (
                <BottleOptionModal
                    product={selectedProduct}
                    shotSizes={shotSizes}
                    onClose={() => setIsModalOpen(false)}
                    onSelect={addToCart}
                />
            )}
        </>
    );
}
