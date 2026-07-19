<?php

namespace App\Enums;

enum UserRole: string
{
    // System Roles
    case SYSTEM_ADMIN = 'system_admin';

    // Shop Roles (Bound to a shop_id)
    case OWNER = 'owner';
    case SHOP_MANAGER = 'shop_manager';
    case MANAGER = 'manager';
    case BARTENDER = 'bartender';
    case WAITER = 'waiter';
    case STAFF = 'staff';

    /**
     * Check if the user is a system-level user.
     */
    public function isSystemUser(): bool
    {
        return $this === self::SYSTEM_ADMIN;
    }

    /**
     * Readable labels for frontend dropdowns.
     */
    public function label(): string
    {
        return match ($this) {
            self::SYSTEM_ADMIN => 'System Admin',
            self::OWNER => 'Owner',
            self::SHOP_MANAGER => 'Shop Manager',
            self::MANAGER => 'Manager',
            self::BARTENDER => 'Bartender',
            self::WAITER => 'Waiter',
            self::STAFF => 'Staff',
        };
    }
}