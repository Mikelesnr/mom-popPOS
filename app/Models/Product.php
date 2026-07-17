<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Product extends Model
{
    use HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'shop_id',
        'category_id',
        'unit_id',
        'name',
        'cost_price',
        'selling_price',
        'is_perishable'
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cost_price' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'is_perishable' => 'boolean',
        ];
    }

    /**
     * Multi-tenancy context relation.
     */
    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class, 'shop_id');
    }

    /**
     * Extension for liquid inventory metrics (Only visible/applicable for Bar/Restobar).
     */
    public function bottle(): HasOne
    {
        return $this->hasOne(Bottle::class, 'product_id');
    }

    /**
     * Standard retail or kitchen specific unit conversions.
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    /**
     * Audit trail for physical inventory losses.
     */
    public function wasteLogs(): HasMany
    {
        return $this->hasMany(WasteLog::class, 'product_id');
    }

    /**
     * Get the classification category this product belongs to.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function stock(): HasOne
    {
        return $this->hasOne(Stock::class, 'product_id');
    }

    public function costDetails(): HasOne
    {
        return $this->hasOne(ProductCost::class, 'product_id');
    }
}