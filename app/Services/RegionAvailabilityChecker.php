<?php

namespace App\Services;

class RegionAvailabilityChecker
{
    /**
     * Approximate bounding box for Zimbabwe.
     *
     * This is intentionally a simple bounding box, not a precise border
     * polygon. It's a launch-availability check ("are we live in your
     * country yet"), not a security/fraud control, so a few kilometres of
     * imprecision right at the border is an acceptable trade-off for zero
     * external dependencies and zero added latency.
     */
    private const MIN_LAT = -22.4;
    private const MAX_LAT = -15.6;
    private const MIN_LNG = 25.2;
    private const MAX_LNG = 33.1;

    public static function isWithinZimbabwe(float $latitude, float $longitude): bool
    {
        return $latitude >= self::MIN_LAT
            && $latitude <= self::MAX_LAT
            && $longitude >= self::MIN_LNG
            && $longitude <= self::MAX_LNG;
    }
}
