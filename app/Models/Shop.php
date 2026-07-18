<?php

namespace App\Models;

use App\Enums\ShopType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Shop extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'shop_type',
        'latitude',
        'longitude',
        'allowed_radius',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'shop_type' => ShopType::class, // Maps your new enum directly [cite: 63]
            'latitude' => 'decimal:8',     // Decimal(10,8) precision tracking [cite: 67]
            'longitude' => 'decimal:8',    // Decimal(11,8) precision tracking [cite: 71]
            'allowed_radius' => 'integer', // Radius in meters for Haversine checks [cite: 75, 77]
        ];
    }

    /**
     * REAL-WORLD PARITY RELATIONSHIP:
     * Fetch all users who share equity/ownership over this specific shop container.
     */
    public function owners(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'shop_owners', 'shop_id', 'user_id')
            ->withTimestamps();
    }
    /**
     * Get all users (managers, cashiers, bar staff) bound to this shop[cite: 40].
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'shop_id');
    }

    /**
     * Get the inventory product catalog for this tenant[cite: 7, 10].
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'shop_id');
    }

    /**
     * Get the volumetric shot configuration for this shop[cite: 7, 13].
     */
    public function shotSize(): HasOne
    {
        return $this->hasOne(ShotSize::class, 'shop_id');
    }

    /**
     * Track all shift sessions recorded on this shop's terminal[cite: 16].
     */
    public function shifts(): HasMany
    {
        return $this->hasMany(Shift::class, 'shop_id');
    }
}