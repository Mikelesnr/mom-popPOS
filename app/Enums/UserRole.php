<?php

namespace App\Enums;

enum UserRole: string
{
    case ADMIN = 'admin';
    case CASHIER = 'cashier';
    case MANAGER = 'manager';
    case OWNER = 'owner';
}
