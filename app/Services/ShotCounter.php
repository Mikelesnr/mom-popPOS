<?php

namespace App\Services;

class ShotCounter
{
    public function __construct(
        protected InventoryConverter $converter
    ) {
    }

    /**
     * @param float $fullWeight   Weight of a full bottle (grams)
     * @param float $emptyWeight  Weight of the empty glass (grams)
     * @param float $measuredWeight Current weight of the bottle on the scale (grams)
     * @param float $bottleVolumeMl Total volume of the bottle (ml)
     * @param float $shotSizeMl    Shop-specific shot size (ml)
     * @return int
     */
    public function calculateCurrentShots(
        float $fullWeight,
        float $emptyWeight,
        float $measuredWeight,
        float $bottleVolumeMl,
        float $shotSizeMl
    ): int {
        // Prevent division by zero if weights are invalid
        $totalLiquidWeight = $fullWeight - $emptyWeight;
        if ($totalLiquidWeight <= 0) {
            return 0;
        }

        // Calculate the fraction of the bottle remaining (0.0 to 1.0)
        $currentLiquidWeight = max(0, $measuredWeight - $emptyWeight);
        $fillRatio = $currentLiquidWeight / $totalLiquidWeight;

        // Get max shots in a full bottle
        $maxShots = $this->converter->convertToShots($bottleVolumeMl, $shotSizeMl);

        // Calculate remaining shots and floor it
        return (int) floor($fillRatio * $maxShots);
    }
}