<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Unit extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',            // e.g., 'Gram', 'Kilogram', 'Pack of 6'
        'conversion_rate', // Number of base inventory elements this unit represents
    ];

    protected function casts(): array
    {
        return [
            'conversion_rate' => 'decimal:3',
        ];
    }

    /**
     * Products that use this unit.
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'unit_id');
    }
}
