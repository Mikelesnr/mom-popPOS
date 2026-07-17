import React from "react";
import { AlertTriangle } from "lucide-react";
import EditableCountInput from "./EditableCountInput";

export default function StockCountRow({
    product,
    onUpdateItemUiState,
    shopShotSizeMl,
    isLocked,
}) {
    // Prepare item data structure needed by the input cell
    const itemDataForInput = {
        id: product.id,
        name: product.name,
        unit_name: product.unit?.name || "units", // Fallback
        catalog_data: product, // Raw Dexie product data
        ui_state: product.ui_state || { shots: null, each_count: null },
    };

    const isBottle = product.bottle_specs;

    // Determine the generic display descriptor (e.g., "bottle", "unit single")
    // We take this from the Unit name defined in the backend/catalog
    const unitDescriptor = isBottle ? "bottle" : "single";

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 hover:bg-gray-50/50 transition-colors gap-2 items-center px-2 py-1">
            {/* Product Info (Spans 8 columns on desktop, 1 on mobile)[cite: 2] */}
            <div className="col-span-1 md:col-span-8 py-2 flex flex-col">
                <span className="text-sm font-medium text-gray-950">
                    {product.name}
                </span>
                {product.sku && (
                    <span className="text-xs text-gray-500 font-mono">
                        SKU: {product.sku}
                    </span>
                )}

                {/* Simplified descriptor based on unit name only */}
                <span className="text-xs text-gray-400 mt-0.5 capitalize">
                    {unitDescriptor}
                </span>

                {isLocked && (
                    <div className="flex items-center gap-1 mt-1.5 text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full text-xs w-fit font-medium">
                        <AlertTriangle size={12} />
                        <span>Counted - Pending Sync</span>
                    </div>
                )}
            </div>

            {/* --- SYSTEM QTY COLUMN REMOVED --- */}

            {/* Count Input (Spans 4 columns on desktop, 1 on mobile)[cite: 2] */}
            <div className="col-span-1 md:col-span-4 relative h-full min-h-[44px]">
                <EditableCountInput
                    item={itemDataForInput}
                    onUpdate={onUpdateItemUiState}
                    shopShotSizeMl={shopShotSizeMl}
                    isLocked={isLocked}
                />
            </div>
        </div>
    );
}
