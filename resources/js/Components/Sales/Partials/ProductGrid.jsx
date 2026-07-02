export default function ProductGrid({
    filteredProducts,
    shotSizes,
    addToCart,
    activeColorClass,
}) {
    if (!filteredProducts || filteredProducts.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-700 rounded-xl text-slate-400 font-bold text-sm bg-slate-900/40">
                NO PRODUCTS IN THIS CATEGORY
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 p-1 select-none content-start">
            {filteredProducts.map((product) => (
                <button
                    key={product.id}
                    onClick={() => addToCart(product, false)}
                    className={`h-16 sm:h-18 md:h-20 rounded-lg flex items-center justify-center text-center shadow active:scale-95 transition-all cursor-pointer border border-slate-700/50 font-bold uppercase tracking-tight text-[11px] sm:text-xs md:text-sm ${activeColorClass}`}
                >
                    {product.name}
                </button>
            ))}
        </div>
    );
}
