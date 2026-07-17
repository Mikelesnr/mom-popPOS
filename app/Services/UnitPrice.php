<?php

namespace App\Services;

use App\Models\Unit;
use App\Models\ShotSize;
use Illuminate\Support\Facades\Auth; // Import the Auth facade

class UnitPrice
{
    protected $inventoryConverter;

    public function __construct(InventoryConverter $inventoryConverter)
    {
        $this->inventoryConverter = $inventoryConverter;
    }

    public function calculateUnitCost(float $costPrice, string $unitId, bool $isBottle): float
    {
        // 1. Fetch unit details[cite: 6]
        $unit = Unit::findOrFail($unitId);
        $conversionRate = (float) $unit->conversion_rate;

        if ($conversionRate <= 0)
            return $costPrice;

        if ($isBottle) {
            // 2. Automatically retrieve shop ID from the authenticated user
            $shopId = Auth::user()->shop_id;

            $shotSizeConfig = ShotSize::where('shop_id', $shopId)->first();
            $shotSizeMl = $shotSizeConfig ? $shotSizeConfig->size_ml : 25;

            $totalShots = $this->inventoryConverter->convertToShots($conversionRate, $shotSizeMl);

            return $totalShots > 0 ? ($costPrice / $totalShots) : $costPrice;
        }

        // 3. Simple division for packs[cite: 6]
        return $costPrice / $conversionRate;
    }
}