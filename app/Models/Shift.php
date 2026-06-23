<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shift extends Model
{
    use HasUuids;

    protected $fillable = [
        'shop_id', 
        'user_id', 
        'opened_at', 
        'closed_at',
        'blind_cash_reported', 
        'blind_ecocash_reported', 
        'blind_swipe_reported', 
        'blind_onemoney_reported'
    ];

    public function shop(): BelongsTo 
    { 
        return $this->belongsTo(Shop::class, 'shop_id'); 
    }

    public function user(): BelongsTo 
    { 
        return $this->belongsTo(User::class, 'user_id'); 
    }

    public function orders(): HasMany 
    { 
        return $this->hasMany(Order::class, 'shift_id'); 
    }

    /**
     * Fetch all temporary running tabs initialized during this shift.
     */
    public function tables(): HasMany
    {
        return $this->hasMany(Table::class, 'shift_id');
    }
}