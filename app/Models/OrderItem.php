<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Enums\InventoryItemType;

class OrderItem extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'orderable_id',
        'orderable_type',
        'name',
        'product_id',
        'quantity',
        'unit_price',
        'subtotal',
        'metadata',
    ];

    protected $casts = [
        'metadata' => InventoryItemType::class,
    ];


    public function orderable(): MorphTo
    {
        return $this->morphTo();
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
