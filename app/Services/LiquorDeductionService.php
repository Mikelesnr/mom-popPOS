<?php

namespace App\Services;

use App\Contracts\InventoryDeductionServiceInterface;
use App\Models\OrderItem;
use App\Models\Product;
use App\Services\InventoryConverter; // Import the singleton
use Illuminate\Support\Facades\Log;

class LiquorDeductionService implements InventoryDeductionServiceInterface
{
    // Inject the converter to handle bottle-to-shot math
    public function __construct(
        protected InventoryConverter $converter
    ) {
    }

    // Define standard pours directly in BASE UNITS (Shots)
    // A 'shot' is always 1 base unit. A 'double' is always 2 base units.
    const POUR_UNITS_SHOT = 1;
    const POUR_UNITS_DOUBLE = 2;

    /**
     * Handles deduction for liquor sales.
     * Since stocks.quantity_on_hand stores total shots, we decrement by calculated units.
     */
    public function deduct(OrderItem $item, string $saleType): void
    {
        // Lock stock and load related data required for configuration-based math
        $product = Product::with(['stock', 'bottle', 'unit', 'shop.shotSize'])
            ->lockForUpdate()
            ->find($item->product_id);

        if (!$product || !$product->stock) {
            Log::warning("Attempted to deduct liquor for missing product/stock ID: {$item->product_id}");
            return;
        }

        $deductionInBaseUnits = 0.0;
        // The quantity sold from the POS (e.g., 3 shots sold)
        $quantitySold = (float) $item->quantity;

        // Determine deduction logic based on metadata string
        switch (strtolower($saleType)) {
            case 'shot':
                // Simple: 1 shot = 1 base unit
                $deductionInBaseUnits = self::POUR_UNITS_SHOT * $quantitySold;
                break;

            case 'double':
                // Simple: 1 double = 2 base units
                $deductionInBaseUnits = self::POUR_UNITS_DOUBLE * $quantitySold;
                break;

            case 'bottle':
                // Complex: Calculate based on DB configuration

                if (!$product->bottle || !$product->unit || !$product->shop->shotSize) {
                    Log::error("Sold as 'bottle' but missing configuration for product ID: {$product->id}. Deduction failed.");
                    return;
                }

                // 1. Bottle's Volume (fetched from Units table conversion_rate, stored in ml)
                $bottleVolumeMl = (float) $product->unit->conversion_rate;

                // 2. Shop's Standard Pour Size (fetched from ShotSize table, actual value size_ml)
                $shotSizeMl = (float) $product->shop->shotSize->size_ml;

                if ($shotSizeMl <= 0 || $bottleVolumeMl <= 0) {
                    Log::error("Invalid configuration for bottle ID {$product->bottle->id}. Vol: {$bottleVolumeMl}, ShotSize: {$shotSizeMl}.");
                    return;
                }

                // 3. Calculate shots per bottle using your singleton
                // Math: (Bottle Volume ML) / (Shop Shot Size ML)
                $shotsPerBottle = $this->converter->convertToShots($bottleVolumeMl, $shotSizeMl);

                if ($shotsPerBottle <= 0) {
                    Log::error("Calculated 0 shots for product ID {$product->id}. Bottle Vol is smaller than configured shot size.");
                    return;
                }

                // 4. Total deduction = (Shots per bottle) x (Number of bottles sold)
                $deductionInBaseUnits = (float) $shotsPerBottle * $quantitySold;
                break;

            default:
                Log::warning("Unknown liquor type: {$saleType} for product ID: {$product->id}. No deduction made.");
                return;
        }

        if ($deductionInBaseUnits > 0) {
            // Perform atomic decrement of base units (shots)
            $product->stock->decrement('quantity_on_hand', $deductionInBaseUnits);
            Log::info("✅ [LiquorDeductionService] Deducted {$deductionInBaseUnits} base units (shots) for Product ID: {$product->id} ({$quantitySold} x {$saleType}).");
        }
    }
}