/**
 * Client-Side Shot Counter Utility (Dexie Mapped)
 */

const ShotCounter = {
    calculateEstimatedShotsFromWeight: (
        measuredWeightGrams,
        bottleSpecs,
        shopShotSizeMl,
    ) => {
        const measured = parseFloat(measuredWeightGrams) || 0;

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

        const empty = parseFloat(bottleSpecs.tare_weight_g);
        const full = parseFloat(bottleSpecs.gross_weight_g);
        const totalVol = parseFloat(bottleSpecs.capacity_ml);
        const shotSize = parseFloat(shopShotSizeMl);

        const totalLiquidWeight = full - empty;
        const currentLiquidWeight = Math.max(0, measured - empty);
        const fillRatio = currentLiquidWeight / totalLiquidWeight;
        const maxShotsInFullBottle = totalVol / shotSize;

        return Math.floor(fillRatio * maxShotsInFullBottle);
    },

    calculateShotsFromFullBottles: (
        fullBottleCount,
        bottleSpecs,
        shopShotSizeMl,
    ) => {
        if (!bottleSpecs?.capacity_ml || !shopShotSizeMl || shopShotSizeMl <= 0)
            return 0;
        const shotsPerBottle = bottleSpecs.capacity_ml / shopShotSizeMl;
        return Math.floor(fullBottleCount * shotsPerBottle);
    },

    convertShotsToMl: (shots, shopShotSizeMl) => {
        const finalShots = parseInt(shots) || 0;
        if (!shopShotSizeMl || shopShotSizeMl <= 0) return 0;
        const totalMl = finalShots * parseFloat(shopShotSizeMl);
        return parseFloat(totalMl.toFixed(3));
    },

    isBottleProduct: (productCatalogEntry) => {
        return (
            productCatalogEntry &&
            productCatalogEntry.bottle_specs &&
            productCatalogEntry.bottle_specs.is_weighable === true
        );
    },
};

export default ShotCounter;
