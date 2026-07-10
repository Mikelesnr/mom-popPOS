<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use App\Enums\OrderStatus;

class Order extends Model
{

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'shift_id',
        'user_id',
        'total_amount',
        'payment_method',
        'status',
    ];

    protected $casts = [
        'status' => OrderStatus::class,
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class, 'shift_id');
    }

    public function items(): MorphMany
    {
        return $this->morphMany(OrderItem::class, 'orderable');
    }
}
