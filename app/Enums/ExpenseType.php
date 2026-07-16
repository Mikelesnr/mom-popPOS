<?php

namespace App\Enums;

enum ExpenseType: string
{
    case FIXED = 'fixed';
    case SALARY = 'salary';
    case VARIABLE = 'variable';
    case Stock = 'stock';

    /**
     * Optional helper to get a clean array of values for the database migration schema.
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}