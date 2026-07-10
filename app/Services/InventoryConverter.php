<?php

namespace App\Services;

class InventoryConverter
{
    /**
     * Convert bottle inventory volume to total full shots.
     * * @param float $bottleVolumeMl The total volume of the bottle in ML.
     * @param float $shotSizeMl The size of a single shot in ML.
     * @return int
     */
    public function convertToShots(float $bottleVolumeMl, float $shotSizeMl): int
    {
        if ($shotSizeMl <= 0 || $bottleVolumeMl < $shotSizeMl) {
            return 0;
        }

        return (int) floor($bottleVolumeMl / $shotSizeMl);
    }
}
