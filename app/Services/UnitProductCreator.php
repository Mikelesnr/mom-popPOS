<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Unit;
use App\Enums\UnitType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UnitProductCreator
{
    protected $unit;

    // Injected singleton via constructor
    public function __construct(UnitPrice $unit)
    {
        $this->unit = $unit;
    }

    /**
     * Create a standard product and its initial stock/cost records.
     */
    public function create(array $data, string $shopId): Product
    {
        \Log::info('UnitProductCreator: create called', ['data' => $data]);

        try {
            return DB::transaction(function () use ($data, $shopId) {
                $unit = Unit::where('id', $data['unit_id'])
                    ->where('type', UnitType::UNIT)
                    ->firstOrFail();

                \Log::info('UnitProductCreator: Found unit', ['unit' => $unit->toArray()]);

                $product = Product::create([
                    'shop_id' => $shopId,
                    'category_id' => $data['category_id'],
                    'unit_id' => $unit->id,
                    'name' => $data['name'],
                    'cost_price' => $data['cost_price'],
                    'selling_price' => $data['selling_price'],
                    'is_perishable' => $data['is_perishable'] ?? false,
                ]);

                \Log::info('UnitProductCreator: Product created', ['product_id' => $product->id]);

                $product->stock()->create([
                    'quantity_on_hand' => 0,
                    'count' => 0,
                ]);

                $unitCost = $this->unit->calculateUnitCost(
                    (float) $data['cost_price'],
                    $data['unit_id'],
                    false
                );

                \Log::info('UnitProductCreator: Calculated unit cost', [
                    'product_id' => $product->id,
                    'unitCost' => $unitCost,
                ]);

                $product->costDetails()->updateOrCreate(
                    ['product_id' => $product->id],
                    [
                        'unit_cost' => $unitCost,
                        'is_bottle' => false,
                    ]
                );

                return $product;
            });
        } catch (\Throwable $e) {
            \Log::error('UnitProductCreator: Error creating product', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'data' => $data,
            ]);
            throw $e;
        }
    }

}