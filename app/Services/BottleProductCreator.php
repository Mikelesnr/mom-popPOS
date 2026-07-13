<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Unit;
use App\Enums\UnitType;
use Illuminate\Support\Facades\DB;

class BottleProductCreator
{
    /**
     * Create a bottle-type product, its stock record, and the bottle configuration.
     */
    public function create(array $data, string $shopId): Product
    {
        error_log(print_r($data, true));

        return DB::transaction(function () use ($data, $shopId) {
            // Validate the unit exists and is of type 'bottle'
            $unit = Unit::where('id', $data['unit_id'])
                ->where('type', UnitType::BOTTLE)
                ->firstOrFail();

            // Create the Product
            $product = Product::create([
                'shop_id' => $shopId,
                'category_id' => $data['category_id'],
                'unit_id' => $unit->id,
                'name' => $data['name'],
                'cost_price' => $data['cost_price'],
                'selling_price' => $data['selling_price'],
                'is_perishable' => $data['is_perishable'] ?? false,
            ]);

            // Initialize Stock with zero quantity
            $product->stock()->create([
                'quantity_on_hand' => 0,
                'count' => 0,
            ]);

            // Create the specific Bottle configuration
            $product->bottle()->create([
                'is_weighable' => $data['bottle']['is_weighable'] ?? true,
                'capacity_ml' => $data['bottle']['capacity_ml'],
                'tare_weight_g' => $data['bottle']['tare_weight_g'],
                'gross_weight_g' => $data['bottle']['gross_weight_g'],
                'bottle_selling_price' => $data['bottle']['bottle_selling_price'] ?? $data['selling_price'],
            ]);

            return $product;
        });
    }
}