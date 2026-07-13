<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\DB;

class BottleProductUpdater
{
    public function update(Product $product, array $data): Product
    {
        return DB::transaction(function () use ($product, $data) {
            $product->update([
                'name' => $data['name'],
                'category_id' => $data['category_id'],
                'unit_id' => $data['unit_id'],
                'cost_price' => $data['cost_price'],
                'selling_price' => $data['selling_price'],
                'is_perishable' => $data['is_perishable'] ?? false,
            ]);

            // Update or create the bottle configuration
            $product->bottle()->updateOrCreate(
                ['product_id' => $product->id],
                $data['bottle']
            );

            return $product;
        });
    }
}