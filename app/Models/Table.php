<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Table extends Model
{
    use HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'shift_id',         // Bound directly to the active operational shift session
        'name',            // e.g., 'Table 4', 'Bar Tab - John Doe', 'VIP Lounge'
        'current_order_id' // Nullable: Points to the active open order tracking the tab
    ];

    /**
     * The specific shift session tracking this running tab.
     */
    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class, 'shift_id');
    }

    /**
     * The active open order/ledger line currently tied to this tab.
     */
    public function currentOrder(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'current_order_id');
    }
}