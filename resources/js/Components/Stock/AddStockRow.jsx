import React from "react";
import { Wine } from "lucide-react";

// Import the input component
import AddStockInput from "./AddStockInput";

export default function AddStockRow({ product, isLocked, onStockQueued }) {
    // Ensure callback is received
    // Determine product type info based on catalog data
    const isSpirit = product.bottle_specs !== null;
    // Determine purchase unit name for display
    const purchaseUnitName =
        product.unit?.name || (isSpirit ? "bottles" : "units");

    // Current QOH
    const currentTotalAvailable = parseFloat(
        product.stock?.quantity_on_hand || 0,
    );
    const qohSuffix = isSpirit ? "Shots" : "Units";

    // Styling classes
    const containerClass = `grid grid-cols-12 hover:bg-gray-50/50 transition-colors gap-2 items-center px-2 py-2 ${
        isLocked ? "opacity-60 bg-green-50" : ""
    }`;

    const infoClass = `col-span-7 flex flex-col`;
    // Input section takes 5 columns
    const inputClass = `col-span-5 relative h-full min-h-[44px] flex items-center justify-end gap-2`;

    return (
        <article className={containerClass}>
            {/* Product Info Section */}
            <div className={infoClass}>
                <span className="text-sm font-medium text-gray-950 leading-tight">
                    {product.name}
                </span>
                {product.sku && (
                    <span className="text-xs text-gray-500 font-mono mt-0.5">
                        SKU: {product.sku}
                    </span>
                )}
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded-md w-fit border border-blue-100">
                    <span className="font-medium text-blue-900">In Stock:</span>
                    <span className="font-bold text-blue-700 tabular-nums">
                        {currentTotalAvailable.toLocaleString("en-US", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                        })}
                    </span>
                    <span className="text-blue-800">{qohSuffix}</span>
                </div>
            </div>

            {/* --- FIXED: Input Section ALWAYS Renders Input --- */}
            <div className={inputClass}>
                <div className="flex items-center gap-2 w-full h-full">
                    <div className="flex-grow h-full relative">
                        {/* 
                           ALWAYS render AddStockInput. 
                           It now internally handles:
                           1. Showing "Tap to add" (Unlocked)
                           2. Showing Edit Form
                           3. Showing "Queued" + X button (Locked)
                        */}
                        <AddStockInput
                            product={product}
                            isLocked={isLocked}
                            onStockQueued={onStockQueued} // MUST pass callback down
                        />
                    </div>
                    <span className="text-sm font-bold text-gray-800 bg-gray-100 px-2 py-2.5 rounded-lg min-w-[65px] text-center border border-gray-200 shadow-inner truncate text-xs select-none">
                        {purchaseUnitName}
                    </span>
                </div>
            </div>
        </article>
    );
}
