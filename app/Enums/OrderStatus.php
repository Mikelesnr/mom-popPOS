<?php

namespace App\Enums;

enum OrderStatus: string
{
    case OPEN = 'open';
    case PAID = 'paid';
    case DEFERRED = 'deferred';
}