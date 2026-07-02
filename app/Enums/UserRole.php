<?php

namespace App\Enums;

enum UserRole: string
{
    case SYSTEM_ADMIN = 'admin';
    case SYSTEM_STAFF = 'system_staff';
    case SYSTEM_TECHNICIAN = 'system_technician';
    case SYSTEM_ACCOUNTANT = 'system_accountant';
    case SHOP_MANAGER = 'shop_manager';
    case MANAGER = 'manager';
    case CASHIER = 'cashier';
    case BARTENDER = 'bartender';
    case WAITER = 'waiter';
    case STAFF = 'staff';
    case OWNER = 'owner';
}
