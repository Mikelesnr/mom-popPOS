<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProductUpdater
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

                // Ensure no orphaned bottle data exists
                $product->bottle()->delete();

                // Recalculate unit cost for standard unit
                $unitCost = $this->unit->calculateUnitCost(
                    (float) $data['cost_price'],
                    $data['unit_id'],
                    false
                );

                Log::info('ProductUpdater: recalculated unit cost', [
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
            Log::error('ProductUpdater: update failed', [
                'product_id' => $product->id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'data' => $data,
            ]);
            throw $e;
        }
    }
}
