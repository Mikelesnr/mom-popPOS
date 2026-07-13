<?php

namespace App\Services;

use App\Models\ShotSize;
use App\Models\Shop;

class ShotCounter
{
    public function __construct(
        protected InventoryConverter $converter
    ) {
    }

    /**
     * Calculates remaining shots based on a shop's specific configuration.
     */
    public function calculateCurrentShots(
        Shop $shop, // Inject the shop model to resolve context
        float $fullWeight,
        float $emptyWeight,
        float $measuredWeight,
        float $bottleVolumeMl
    ): int {
        // Fetch shot size directly from the database for this shop
        $shotSize = ShotSize::where('shop_id', $shop->id)->firstOrFail();
        $shotSizeMl = $shotSize->size_ml;

        $totalLiquidWeight = $fullWeight - $emptyWeight;
        if ($totalLiquidWeight <= 0) {
            return 0;
        }

        $currentLiquidWeight = max(0, $measuredWeight - $emptyWeight);
        $fillRatio = $currentLiquidWeight / $totalLiquidWeight;

        $maxShots = $this->converter->convertToShots($bottleVolumeMl, $shotSizeMl);

        return (int) floor($fillRatio * $maxShots);
    }
}