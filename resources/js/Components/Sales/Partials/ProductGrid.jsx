import { useState } from "react";
import BottleOptionModal from "@/Components/Sales/Partials/BottleOptionModal";

export default function ProductGrid({
    filteredProducts,
    shotSizes, // We need to pass this down
    addToCart,
    activeColorClass,
}) {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleProductClick = (product) => {
        if (product.bottle) {
            // It's a spirit/bottle, open selection options
            setSelectedProduct(product);
            setIsModalOpen(true);
        } else {
            // It's a standard retail item (e.g., Coke, beer), add immediately
            addToCart(product, "unit", 1); // Using type/qty structure now
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
                        {product.bottle && (
                            <span className="block text-[9px] opacity-70">
                                SPIRIT
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* The Selection Modal */}
            {isModalOpen && selectedProduct && (
                <BottleOptionModal
                    product={selectedProduct}
                    shotSizes={shotSizes}
                    onClose={() => setIsModalOpen(false)}
                    onSelect={addToCart} // Pass the refined addToCart function
                />
            )}
        </>
    );
}
