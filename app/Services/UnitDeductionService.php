<?php

namespace App\Services;

use App\Contracts\InventoryDeductionServiceInterface;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Support\Facades\Log;

class UnitDeductionService implements InventoryDeductionServiceInterface
{
    /**
     * Handles deduction for items stocked in base units (e.g., individual beers/sodas).
     * Since quantity_on_hand stores total base units, this is a simple decrement.
     *
     * @param OrderItem $item The item being sold.
     * @param string $saleType Ignored for units, as it is always a 1:1 decrement of base units.
     * @return void
     */
    public function deduct(OrderItem $item, string $saleType): void
    {
        // 1. Lock the stock record
        $product = Product::with('stock')->lockForUpdate()->find($item->product_id);

        if (!$product || !$product->stock) {
            Log::warning("Attempted to deduct stock for missing product/stock ID: {$item->product_id}");
            return;
        }

        $stock = $product->stock;

        // $item->quantity is the integer count of physical items sold (e.g., 1 beer)
        $quantitySold = (float) $item->quantity;

        // 2. Perform atomic decrement directly on the base unit count
        $stock->decrement('quantity_on_hand', $quantitySold);

        Log::info("✅ [UnitDeductionService] Deducted stock for Product ID: {$product->id}. {$quantitySold} base units sold.");
    }
}