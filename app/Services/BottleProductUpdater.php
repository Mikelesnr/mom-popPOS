<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BottleProductUpdater
{
    protected $unit;

    public function __construct(UnitPrice $unit)
    {
        $this->unit = $unit;
    }

    public function update(Product $product, array $data): Product
    {
        try {
            return DB::transaction(function () use ($product, $data) {
                $product->update([
                    'name' => $data['name'],
                    'category_id' => $data['category_id'],
                    'unit_id' => $data['unit_id'],
                    'cost_price' => $data['cost_price'],
                    'selling_price' => $data['selling_price'],
                    'is_perishable' => $data['is_perishable'] ?? false,
                ]);

                $product->bottle()->updateOrCreate(
                    ['product_id' => $product->id],
                    $data['bottle']
                );

                // Recalculate unit cost for bottle
                $unitCost = $this->unit->calculateUnitCost(
                    (float) $data['cost_price'],
                    $data['unit_id'],
                    true
                );

                Log::info('BottleProductUpdater: recalculated unit cost', [
                    'product_id' => $product->id,
                    'unitCost' => $unitCost,
                ]);

                $product->costDetails()->updateOrCreate(
                    ['product_id' => $product->id],
                    [
                        'unit_cost' => $unitCost,
                    ]
                );

                return $product;
            });
        } catch (\Throwable $e) {
            Log::error('BottleProductUpdater: update failed', [
                'product_id' => $product->id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'data' => $data,
            ]);
            throw $e;
        }
    }
}
