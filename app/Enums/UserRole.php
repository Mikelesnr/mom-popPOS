<?php

namespace App\Enums;

enum UserRole: string
{
    case ADMIN = 'admin';
    case ShopMANAGER = 'shop_manager';
    case MANAGER = 'manager';
    case CASHIER = 'cashier';
    case BARTENDER = 'bartender';
    case WAITER = 'waiter';
    case STAFF = 'staff';
    case OWNER = 'owner';
}
