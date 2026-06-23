<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Bottle extends Model
{
    use HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'product_id',
        'is_weighable',
        'capacity_ml',
        'tare_weight_g',
        'gross_weight_g',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_weighable' => 'boolean',
            'capacity_ml' => 'integer',
            'tare_weight_g' => 'integer',
            'gross_weight_g' => 'integer',
        ];
    }

    /**
     * Parent item relation context.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * Compute remaining fluid volume using isolated linear mass-to-volume logic.
     */
    public function computeRemainingFluidVolume(int $scaleWeightGrams): float
    {
        if (!$this->is_weighable || !$this->tare_weight_g || !$this->gross_weight_g) {
            return 0.0;
        }

        if ($scaleWeightGrams <= $this->tare_weight_g) {
            return 0.0;
        }

        $netFluidGrams = $scaleWeightGrams - $this->tare_weight_g;
        $maxFluidGrams = $this->gross_weight_g - $this->tare_weight_g;

        if ($maxFluidGrams <= 0) {
            return 0.0;
        }

        $volumeRatio = $netFluidGrams / $maxFluidGrams;

        return round($volumeRatio * $this->capacity_ml, 2);
    }
}