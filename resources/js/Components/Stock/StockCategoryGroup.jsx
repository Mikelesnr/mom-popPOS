import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import StockCountRow from "./StockCountRow";

export default function StockCategoryGroup({
    category,
    onUpdateItemUiState,
    shopShotSizeMl,
    expanded,
    onToggle,
    lockedProductIds,
}) {
    const products = category.products || [];
    if (products.length === 0) return null;

    return (
        <div className="mb-3 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <button
                onClick={() => onToggle(category.id)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 transition-colors"
            >
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    {expanded ? (
                        <ChevronDown size={18} className="text-gray-500" />
                    ) : (
                        <ChevronRight size={18} className="text-gray-500" />
                    )}
                    {category.name}
                    <span className="text-xs font-normal text-gray-500 ml-1">
                        ({products.length} items)
                    </span>
                </h3>
            </button>

            {expanded && (
                <div className="divide-y divide-gray-100">
                    {products.map((product) => (
                        <StockCountRow
                            key={product.id}
                            product={product}
                            onUpdateItemUiState={onUpdateItemUiState}
                            shopShotSizeMl={shopShotSizeMl}
                            isLocked={lockedProductIds.has(product.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
