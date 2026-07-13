<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Unit;
use App\Enums\UnitType;
use Illuminate\Support\Facades\DB;

class UnitProductCreator
{
    /**
     * Create a standard product and its initial stock record.
     */
    public function create(array $data, string $shopId): Product
    {
        return DB::transaction(function () use ($data, $shopId) {
            // Validate the unit exists and is of type 'unit'
            $unit = Unit::where('id', $data['unit_id'])
                ->where('type', UnitType::UNIT)
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

            return $product;
        });
    }
}