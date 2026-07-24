<?php

namespace App\Http\Controllers\Stock;

use App\Http\Controllers\Controller;
use App\Models\Stock;
use App\Models\StockVariance;
use Illuminate\Http\Request;
use App\Services\UnitProductCreator;
use App\Services\BottleProductCreator;
use App\Services\ProductUpdater;
use App\Services\BottleProductUpdater;
use App\Services\InventoryConverter;
use App\Models\Product;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\QueryException;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class StockController extends Controller
{

    protected $unitUpdater;
    protected $bottleUpdater;
    protected $converter;

    /**
     * Inject the converter service via the controller constructor.
     */
    public function __construct(
        ProductUpdater $unitUpdater,
        BottleProductUpdater $bottleUpdater,
        InventoryConverter $converter
    ) {
        $this->unitUpdater = $unitUpdater;
        $this->bottleUpdater = $bottleUpdater;
        $this->converter = $converter;
    }

    /**
     * Store a new product using injected services.
     */

    public function store(
        Request $request,
        UnitProductCreator $unitCreator,
        BottleProductCreator $bottleCreator
    ) {
        $shopId = Auth::user()->shop_id;

        try {
            if ($request->boolean('is_bottle')) {
                try {
                    $validated = $request->validate([
                        'name' => [
                            'required',
                            'string',
                            Rule::unique('products')->where(fn($q) => $q->where('shop_id', $shopId)),
                        ],
                        'category_id' => 'required|uuid|exists:categories,id',
                        'unit_id' => 'required|uuid|exists:units,id',
                        'cost_price' => 'required|numeric|min:0',
                        'selling_price' => 'required|numeric|min:0',
                        'is_perishable' => 'boolean',
                        'is_bottle' => 'required|boolean',
                        'bottle' => 'required|array',
                        'bottle.capacity_ml' => 'required|numeric',
                        'bottle.tare_weight_g' => 'required|numeric',
                        'bottle.gross_weight_g' => 'required|numeric',
                        'bottle.bottle_selling_price' => 'nullable|numeric',
                    ]);
                } catch (ValidationException $e) {
                    \Log::warning('Validation failed in store()', [
                        'errors' => $e->errors(),
                        'input' => $request->all(),
                    ]);

                    return redirect()->back()
                        ->withErrors($e->errors())
                        ->withInput();
                }

                \Log::info('Store: Bottle product validation passed', ['validated' => $validated]);
                $bottleCreator->create($validated, $shopId);

            } else {
                try {
                    $validated = $request->validate([
                        'name' => [
                            'required',
                            'string',
                            Rule::unique('products')->where(fn($q) => $q->where('shop_id', $shopId)),
                        ],
                        'category_id' => 'required|uuid|exists:categories,id',
                        'unit_id' => 'required|uuid|exists:units,id',
                        'cost_price' => 'required|numeric|min:0',
                        'selling_price' => 'required|numeric|min:0',
                        'is_perishable' => 'boolean',
                        'is_bottle' => 'required|boolean',
                    ]);
                } catch (ValidationException $e) {
                    \Log::warning('Validation failed in store()', [
                        'errors' => $e->errors(),
                        'input' => $request->all(),
                    ]);

                    return redirect()->back()
                        ->withErrors($e->errors())
                        ->withInput();
                }

                \Log::info('Store: Unit product validation passed', ['validated' => $validated]);
                $unitCreator->create($validated, $shopId);
            }

            return redirect()->back()->with('message', 'Product created successfully');

        } catch (ValidationException $e) {
            \Log::warning('Store: Validation failed', ['errors' => $e->errors()]);
            return redirect()->back()->withErrors($e->errors())->withInput();

        } catch (QueryException $e) {
            \Log::error('Store: Database error', [
                'message' => $e->getMessage(),
                'sql' => $e->getSql(),
                'bindings' => $e->getBindings(),
            ]);
            return redirect()->back()->with('error', 'Database error: ' . $e->getMessage());

        } catch (\Throwable $e) {
            \Log::error('Store: Unexpected error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return redirect()->back()->with('error', 'Unexpected error occurred.');
        }
    }

    /**
     * Update the specified product in storage.
     */
    public function update(
        Request $request,
        string $id,
        ProductUpdater $unitUpdater,
        BottleProductUpdater $bottleUpdater
    ) {
        $product = Product::findOrFail($id);

        if ($request->boolean('is_bottle')) {
            // Bottle-specific validation
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'category_id' => 'required|uuid|exists:categories,id',
                'unit_id' => 'required|uuid|exists:units,id',
                'cost_price' => 'required|numeric|min:0',
                'selling_price' => 'required|numeric|min:0',
                'is_perishable' => 'boolean',
                'is_bottle' => 'required|boolean',
                'bottle' => 'required|array',
                'bottle.capacity_ml' => 'required|numeric',
                'bottle.tare_weight_g' => 'required|numeric',
                'bottle.gross_weight_g' => 'required|numeric',
                'bottle.bottle_selling_price' => 'nullable|numeric',
            ]);

            \Log::info('Update: Bottle product validation passed', ['validated' => $validated]);
            $bottleUpdater->update($product, $validated);

        } else {
            // Unit-specific validation
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'category_id' => 'required|uuid|exists:categories,id',
                'unit_id' => 'required|uuid|exists:units,id',
                'cost_price' => 'required|numeric|min:0',
                'selling_price' => 'required|numeric|min:0',
                'is_perishable' => 'boolean',
                'is_bottle' => 'required|boolean',
            ]);

            \Log::info('Update: Unit product validation passed', ['validated' => $validated]);
            $unitUpdater->update($product, $validated);
        }

        error_log('Validation passed in StockController for Product ID: ' . $product->id);

        // 3. Return Response
        return redirect()->route('dashboard')
            ->with('success', 'Product updated successfully.');
    }

    /**
     * Handle the bulk reconciliation of a physical stock count.
     *
     * Corrected logic:
     * 1. Update stocks.count with frontend value.
     * 2. Compare count vs quantity_on_hand.
     * 3. If different:
     *    a. Push variance to stock_variances.
     *    b. Replace quantity_on_hand with count.
     * 4. If identical: Do nothing (skip saves).
     *
     * @param  Request  $request
     * @return JsonResponse
     */
    public function reconcile(Request $request)
    {
        try {
            // 1. Strict Validation
            $validated = $request->validate([
                'counts' => 'required|array',
                'counts.*.product_id' => 'required|exists:products,id',
                // Matches decimal:3 cast on Stock model
                'counts.*.quantity_total_base_units' => 'required|numeric|min:0',
            ]);

            Log::info("Starting stock reconciliation (optimized).");

            // 2. Atomic Transaction
            return DB::transaction(function () use ($validated) {

                $processedItemsCount = 0;
                $updatedItemsCount = 0;

                foreach ($validated['counts'] as $entry) {
                    $productId = $entry['product_id'];
                    // The physical count sent from frontend
                    $countedValue = $entry['quantity_total_base_units'];

                    // 3. Pessimistic Lock on Stock row
                    // We lock even if we don't save, to ensure no sales happen during the read
                    $stock = Stock::where('product_id', $productId)
                        ->lockForUpdate()
                        ->first();

                    if (!$stock)
                        continue;

                    $systemQuantity = $stock->quantity_on_hand;

                    // --- OPTIMIZED STRICT LOGIC ---

                    // Step 1: ALWAYS update the 'count' column with the frontend figure
                    // This records what the manager physically entered in the UI.
                    $stock->count = $countedValue;
                    $stock->save();

                    // Step 2 & 3: Compare and Reconcile ONLY IF different
                    // Variance = Count (Physical) - Quantity on Hand (System)
                    $variance = $countedValue - $systemQuantity;

                    // --- FIX: Logic nested inside the IF block ---
                    if (abs($variance) > 0.0001) {
                        Log::debug("Variance P:$productId. Sys:$systemQuantity | Count:$countedValue | Var:$variance");

                        // A. Push variance record
                        StockVariance::create([
                            'product_id' => $productId,
                            'variance' => $variance,
                        ]);

                        // B. Perform Reconciliation: Replace quantity_on_hand with the count
                        $stock->quantity_on_hand = $countedValue;
                        $stock->save();

                        $updatedItemsCount++;
                    } else {
                        Log::debug("No variance for P:$productId. Skipping reconciliation update.");
                    }
                    // ---------------------------------------------

                    $processedItemsCount++;
                }

                Log::info("Reconciliation complete. Processed $processedItemsCount items; updated $updatedItemsCount mismatched items.");

                return response()->json([
                    'message' => 'Stock count reconciled successfully.',
                    'processed_items' => $processedItemsCount,
                    'updated_variances' => $updatedItemsCount,
                ]);
            });
        } catch (\Throwable $e) {
            Log::error('StockReconcile Error: ' . $e->getMessage());
            return response()->json(['message' => 'Reconciliation failed: ' . $e->getMessage()], 500);
        }
    }



    /**
     * Discontinue a product by deleting its stock tracking.
     */
    public function destroy($id)
    {
        $stock = Stock::findOrFail($id);
        $stock->delete();

        return back()->with('success', 'Product discontinued from inventory.');
    }


    /**
     * Handle bulk stock additions.
     *
     * Expected Request Payload Structure:
     * {
     *   "updates": [
     *     {
     *       "product_id": "uuid-or-id-1",
     *       "added_quantity": 5.5
     *     },
     *     {
     *       "product_id": "uuid-or-id-2",
     *       "added_quantity": 2
     *     }
     *   ]
     * }
     *
     * @param  Request  $request
     * @return JsonResponse
     */
    public function bulkUpdateStock(Request $request)
    {
        // 1. Validate the incoming bulk request structure.
        $validated = $request->validate([
            'updates' => 'required|array',
            'updates.*.product_id' => 'required|exists:products,id',
            'updates.*.added_quantity' => 'required|numeric|min:0.01',
        ]);

        // Get authenticated user context for security/logging
        $currentShopId = $request->user()->shop_id;
        $userId = $request->user()->id;

        $processedCount = 0;
        $errors = [];

        // 2. Use a single database transaction for the entire bulk operation.
        DB::beginTransaction();

        try {
            foreach ($validated['updates'] as $index => $updateItem) {
                $productId = $updateItem['product_id'];
                $quantityEntered = (float) $updateItem['added_quantity'];

                // --- START EXACT LOGIC FROM ORIGINAL METHOD ---
                // 2. Fetch product with required relationships, scoped to shop for security.
                $product = Product::with(['unit', 'shop.shotSize', 'bottle'])
                    ->where('id', $productId)
                    ->where('shop_id', $currentShopId)
                    ->first();

                if (!$product) {
                    Log::warning("Bulk Stock Sync Failed: Product ID {$productId} not found or unauthorized for Shop {$currentShopId}. Skipped.");
                    $errors[] = "Item index {$index}: Product configuration error or unauthorized.";
                    continue;
                }

                $unit = $product->unit;
                if (!$unit) {
                    Log::error("Stock Entry Failed: Product ID {$productId} has no unit attached.");
                    $errors[] = "Item '{$product->name}': Product has no unit attached.";
                    continue;
                }

                // Verify if it's a bottle based on relationship existence
                $isBottle = !is_null($product->bottle);

                // 3. Perform Conversion Logic
                $totalBaseUnitsToAdd = 0;

                if ($isBottle) {
                    // --- PATH B: LIQUOR BOTTLES ---
                    $bottleVolumeMl = (float) $product->bottle->capacity_ml;
                    $shotSizeMl = (float) ($product->shop->shotSize->size_ml ?? 30.0);

                    if ($bottleVolumeMl <= 0 || $shotSizeMl <= 0) {
                        Log::error("Stock Entry Failed: Invalid bottle configuration for Product {$productId}.");
                        $errors[] = "Item '{$product->name}': Invalid bottle configuration.";
                        continue;
                    }

                    $shotsPerBottle = $this->converter->convertToShots($bottleVolumeMl, $shotSizeMl);
                    $totalBaseUnitsToAdd = (int) round($quantityEntered * $shotsPerBottle);

                    Log::info("Bulk Sync: Added {$quantityEntered} bottles of '{$product->name}'. Calculated {$totalBaseUnitsToAdd} shots.");

                } else {
                    // --- PATH A: STANDARD UNITS (Packs) ---
                    $itemsPerPack = (float) $unit->conversion_rate;

                    if ($itemsPerPack <= 0) {
                        Log::error("Stock Entry Failed: Invalid conversion rate for Product {$productId}.");
                        $errors[] = "Item '{$product->name}': Invalid unit conversion rate.";
                        continue;
                    }

                    $totalBaseUnitsToAdd = (int) round($quantityEntered * $itemsPerPack);

                    Log::info("Bulk Sync: Added {$quantityEntered} packs of '{$product->name}'. Calculated {$totalBaseUnitsToAdd} units.");
                }

                // 4. Retrieve/Create Stock Record
                $stock = Stock::firstOrCreate(
                    ['product_id' => $productId],
                    ['quantity_on_hand' => 0]
                );

                // 5. Perform the atomic increment
                $stock->increment('quantity_on_hand', $totalBaseUnitsToAdd);

                // --- END EXACT LOGIC FROM ORIGINAL METHOD ---

                // 6. Determine which existing singleton service to call to update 'last updated' fields,
                // using data arrays derived from the product model.

                // Prepare common update data array required by services
                $updateData = [
                    'name' => $product->name,
                    'category_id' => $product->category_id,
                    'unit_id' => $product->unit_id,
                    'cost_price' => $product->cost_price,
                    'selling_price' => $product->selling_price,
                    'is_perishable' => $product->is_perishable,
                ];

                if ($isBottle) {
                    // Add bottle-specific data required by BottleProductUpdater
                    $updateData['bottle'] = [
                        'capacity_ml' => $product->bottle->capacity_ml,
                        'is_sealed' => $product->bottle->is_sealed,
                        // Add other fill level fields if required by your specific Bottle model
                    ];

                    // Call existing singleton service
                    $this->bottleUpdater->update($product, $updateData);
                    Log::debug("Called BottleProductUpdater for product ID {$product->id}");
                } else {
                    // Call existing singleton service
                    $this->unitUpdater->update($product, $updateData);
                    Log::debug("Called ProductUpdater for product ID {$product->id}");
                }

                $processedCount++;
            }

            // 7. Commit Transaction
            DB::commit();

            Log::info("Bulk Stock Sync Successful: Updated {$processedCount} items for Shop {$currentShopId}. User {$userId}.");

            return response()->json([
                'message' => 'Stock updated successfully.',
                'synced_count' => $processedCount,
                'errors' => $errors,
            ], 200);

        } catch (\Exception $e) {
            // 8. Rollback on failure
            DB::rollBack();
            Log::error("Critical Error during Bulk Stock Sync for Shop {$currentShopId}: " . $e->getMessage());

            return response()->json([
                'message' => 'Failed to sync stock due to server error.',
            ], 500);
        }
    }

}