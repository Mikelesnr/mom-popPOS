<?php

namespace App\Enums;

enum InventoryItemType: string
{
    case UNIT = 'unit';
    case SHOT = 'shot';
    case DOUBLE = 'double';
    case BOTTLE = 'bottle';

    // Helper to get labels for dashboard UI
    public function label(): string
    {
        return match ($this) {
            self::UNIT => 'Standard Unit',
            self::SHOT => 'Single Shot',
            self::DOUBLE => 'Double Shot',
            self::BOTTLE => 'Full Bottle',
        };
    }
}