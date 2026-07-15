/**
 * Client-Side Shot Counter Utility (Dexie Mapped)
 * Calculates remaining shots using full/empty weights to self-correct for density.
 */

const ShotCounter = {
    /**
     * Calculates ESTIMATED remaining shots in a partial bottle using the
     * weight ratio method based on Dexie catalog data structure.
     *
     * Formula: Math.floor(
     *   ((Measured - Empty) / (Full - Empty)) * (TotalVolume / ShotSize)
     * )
     */
    calculateEstimatedShotsFromWeight: (
        measuredWeightGrams,
        bottleSpecs,
        shopShotSizeMl,
    ) => {
        const measured = parseFloat(measuredWeightGrams) || 0;

        // 1. Validate required data exists
        if (
            !bottleSpecs ||
            !bottleSpecs.is_weighable ||
            !shopShotSizeMl ||
            shopShotSizeMl <= 0 ||
            !bottleSpecs.capacity_ml ||
            bottleSpecs.capacity_ml <= 0 ||
            !bottleSpecs.tare_weight_g ||
            !bottleSpecs.gross_weight_g ||
            bottleSpecs.gross_weight_g <= bottleSpecs.tare_weight_g
        ) {
            return null;
        }

        // 2. Map Dexie names to local variables
        const empty = parseFloat(bottleSpecs.tare_weight_g);
        const full = parseFloat(bottleSpecs.gross_weight_g);
        const totalVol = parseFloat(bottleSpecs.capacity_ml);
        const shotSize = parseFloat(shopShotSizeMl);

        // 3. Calculate weights of the liquid only
        const totalLiquidWeight = full - empty;
        const currentLiquidWeight = Math.max(0, measured - empty);

        // 4. Calculate Fill Ratio
        const fillRatio = currentLiquidWeight / totalLiquidWeight;

        // 5. Calculate Max Shots in full bottle
        const maxShotsInFullBottle = totalVol / shotSize;

        // 6. Calculate estimated shots (floored)
        const estimatedShots = Math.floor(fillRatio * maxShotsInFullBottle);

        return Math.max(0, estimatedShots);
    },

    /**
     * Converts final entered shots into milliliters for backend ledger.
     * Formula: Shots * ShopShotSizeMl
     */
    convertShotsToMl: (shots, shopShotSizeMl) => {
        const finalShots = parseInt(shots) || 0;
        if (!shopShotSizeMl || shopShotSizeMl <= 0) return 0;

        const totalMl = finalShots * parseFloat(shopShotSizeMl);
        return parseFloat(totalMl.toFixed(3));
    },

    /**
     * Determines if product needs bottle input interface based on Dexie spec.
     */
    isBottleProduct: (productCatalogEntry) => {
        // Based on your dump: 0: {..., bottle_specs: { is_weighable: true, ... }}
        return (
            productCatalogEntry &&
            productCatalogEntry.bottle_specs &&
            productCatalogEntry.bottle_specs.is_weighable === true
        );
    },
};

export default ShotCounter;
