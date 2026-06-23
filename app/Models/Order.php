<?php

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    use HasUuids;

    /**
     * ID is explicitly filled since UUIDs are generated on the edge client.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'id', 
        'shift_id',
        'table_id', // Nullable: Enriched exclusively for Restaurant/Restobar layouts
        'total_amount',
        'payment_method',
        'status',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2', // Immutable ledger line itemization
            'status' => OrderStatus::class, // Rigid Type Safety Gate
        ];
    }

    /**
     * The active staff session context this transaction belongs to.
     */
    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class, 'shift_id');
    }

    /**
     * The structural table assignment metadata (for hospitality contexts).
     */
    public function table(): BelongsTo
    {
        return $this->belongsTo(Table::class, 'table_id');
    }

    /**
     * If this order is an active tab, it can map back as a table's current anchor.
     */
    public function assignedTable(): HasOne
    {
        return $this->hasOne(Table::class, 'current_order_id');
    }

    /**
     * Structural breakdown of purchased items.
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'order_id');
    }
}