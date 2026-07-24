<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class ShopLicense extends Model
{
    use HasUuids;

    protected $fillable = [
        'shop_id',
        'paid_date',
        'duration_days',
        'paid_status',
        'rate',
        'amount_paid',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'paid_date' => 'date',
            'duration_days' => 'integer',
            'paid_status' => 'boolean',
        ];
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function expiresAt(): Carbon
    {
        return Carbon::parse($this->paid_date)->addDays($this->duration_days);
    }

    public function daysRemaining(): int
    {
        return (int) now()->startOfDay()->diffInDays($this->expiresAt(), false);
    }

    /**
     * The single source of truth for whether metrics/analytics should be unlocked.
     * Both the manual toggle AND the date math have to agree.
     */
    public function isCurrentlyValid(): bool
    {
        return $this->paid_status && now()->lte($this->expiresAt());
    }
}