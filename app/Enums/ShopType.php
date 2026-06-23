<?php

namespace App\Enums;

enum ShopType: string
{
    case SHOP = 'shop';
    case BAR = 'bar';
    case RESTOBAR = 'restobar';

    /**
     * Optional helper to get readable display names for the UI.
     */
    public function label(): string
    {
        return match($this) {
            self::SHOP => 'Normal Shop',
            self::BAR => 'Bar',
            self::RESTOBAR => 'Restobar',
        };
    }
}