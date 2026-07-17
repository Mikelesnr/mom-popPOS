<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Unit;
use App\Enums\UnitType;
use Illuminate\Support\Facades\DB;

class BottleProductCreator
{
    protected $unit;

    // Injected singleton via constructor
    public function __construct(UnitPrice $unit)
    {
        $this->unit = $unit;
    }

    /**
     * Create a bottle-type product, stock, bottle config, and cost record.
     */
    public function create(array $data, string $shopId): Product
    {
        return DB::transaction(function () use ($data, $shopId) {
            $unit = Unit::where('id', $data['unit_id'])
                ->where('type', UnitType::BOTTLE)
                ->firstOrFail();

            $product = Product::create([
                'shop_id' => $shopId,
                'category_id' => $data['category_id'],
                'unit_id' => $unit->id,
                'name' => $data['name'],
                'cost_price' => $data['cost_price'],
                'selling_price' => $data['selling_price'],
                'is_perishable' => $data['is_perishable'] ?? false,
            ]);

            $product->stock()->create([
                'quantity_on_hand' => 0,
                'count' => 0,
            ]);

            $product->bottle()->create([
                'is_weighable' => $data['bottle']['is_weighable'] ?? true,
                'capacity_ml' => $data['bottle']['capacity_ml'],
                'tare_weight_g' => $data['bottle']['tare_weight_g'],
                'gross_weight_g' => $data['bottle']['gross_weight_g'],
                'bottle_selling_price' => $data['bottle']['bottle_selling_price'] ?? $data['selling_price'],
            ]);

            // Save unit cost using the singleton
            $unitCost = $this->unit->calculateUnitCost(
                (float) $data['cost_price'],
                $data['unit_id'],
                true
            );

            $product->costDetails()->create([
                'unit_cost' => $unitCost,
            ]);

            return $product;
        });
    }
}