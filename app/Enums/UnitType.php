<?php

namespace App\Enums;

enum UnitType: string
{
    case UNIT = 'unit';
    case BOTTLE = 'bottle';

    public function label(): string
    {
        return match ($this) {
            self::UNIT => 'Unit',
            self::BOTTLE => 'Bottle',
        };
    }
}