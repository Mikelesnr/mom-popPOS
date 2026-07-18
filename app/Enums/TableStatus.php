<?php

namespace App\Enums;

enum TableStatus: string
{
    case Open = 'open';
    case Closed = 'closed';
    case Deferred = 'deferred';
    case Voided = 'void';
}
