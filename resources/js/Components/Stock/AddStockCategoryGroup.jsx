import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import AddStockRow from "./AddStockRow";

export default function AddStockCategoryGroup({
    category,
    expanded,
    onToggle,
    lockedProductIds,
    onStockQueued,
}) {
    const products = category.products || [];
    if (products.length === 0) return null;

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <button
                onClick={() => onToggle(category.id)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 transition-colors"
            >
                <h3 className="text-base font-semibold text-gray-950 flex items-center gap-3">
                    {expanded ? (
                        <ChevronDown size={20} className="text-gray-500" />
                    ) : (
                        <ChevronRight size={20} className="text-gray-500" />
                    )}
                    {category.name}
                    <span className="text-xs font-normal text-gray-500 ml-1 bg-gray-100 px-2 py-0.5 rounded-full">
                        {products.length}
                    </span>
                </h3>
            </button>

            {expanded && (
                <div className="divide-y divide-gray-100">
                    {products.map((product) => (
                        <AddStockRow
                            key={product.id}
                            product={product}
                            isLocked={lockedProductIds.has(product.id)}
                            onStockQueued={onStockQueued}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
