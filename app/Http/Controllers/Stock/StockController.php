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
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

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
        // Define all required fields here so validation doesn't strip them
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|uuid|exists:categories,id',
            'unit_id' => 'required|uuid|exists:units,id',
            'cost_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'is_perishable' => 'boolean',
            'is_bottle' => 'required|boolean',

            // Nested validation for bottle configuration
            'bottle' => 'required_if:is_bottle,true|array',
            'bottle.capacity_ml' => 'required_if:is_bottle,true|numeric',
            'bottle.tare_weight_g' => 'required_if:is_bottle,true|numeric',
            'bottle.gross_weight_g' => 'required_if:is_bottle,true|numeric',
            'bottle.bottle_selling_price' => 'nullable|numeric',
        ]);

        $shopId = $request->user()->shop_id;

        // Pass the fully validated array to the service
        if ($request->boolean('is_bottle')) {
            $bottleCreator->create($validated, $shopId);
        } else {
            $unitCreator->create($validated, $shopId);
        }

        return redirect()->back()->with('message', 'Product created successfully');
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

        // 1. Validation Logic
        // We use the unique ignore rule to allow keeping the current product name[cite: 9]
        $commonRules = [
            'name' => [
                'required',
                'string',
                Rule::unique('products')->where(function ($query) use ($product) {
                    // This ensures the 'name' must be unique within this 'shop_id',
                    // but we ignore the current product's 'shop_id'.
                    return $query->where('shop_id', $product->shop_id);
                })->ignore($product->id),
            ],
            'category_id' => 'required|uuid|exists:categories,id',
            'unit_id' => 'required|uuid|exists:units,id',
            'cost_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'is_perishable' => 'boolean',
            'is_bottle' => 'required|boolean',
        ];

        // 2. Initialize rules array
        $rules = $commonRules;

        // 3. Conditionally merge specific rules based on is_bottle status
        if ($request->boolean('is_bottle')) {
            // If it's a bottle, add bottle-specific required fields
            $rules = array_merge($commonRules, [
                'bottle' => 'required|array', // Ensure 'bottle' is present
                'bottle.capacity_ml' => 'required|numeric',
                'bottle.tare_weight_g' => 'required|numeric',
                'bottle.gross_weight_g' => 'required|numeric',
                'bottle.bottle_selling_price' => 'nullable|numeric',
            ]);
        }

        $validated = $request->validate($rules);

        error_log('Validation passed in StockController for Product ID: ' . $product->id);

        // 2. Service Selection Logic
        // Based on the 'is_bottle' boolean, we route to the specific updater[cite: 9, 11]
        if ($request->boolean('is_bottle')) {
            $bottleUpdater->update($product, $validated);
        } else {
            $unitUpdater->update($product, $validated);
        }

        // 3. Return Response
        return redirect()->route('dashboard')
            ->with('success', 'Product updated successfully.');
    }

    /**
     * Add new stock.
     * Handles conversion for both standard units and liquor bottles based on relationship existence.
     *
     * @param Request $request The request containing 'added_quantity' (packs/bottles)
     * @param string $productId
     */
    // public function updateStock(Request $request, string $productId)
    // {
    //     // 1. Validate input. User enters number of packs or bottles (can be decimal, e.g., 0.5 case).
    //     $validated = $request->validate([
    //         'added_quantity' => 'required|numeric|min:0.01',
    //     ]);

    //     // 2. Fetch product, its unit, shop shot size, AND the related bottle record.
    //     // We use eager loading to optimize queries.
    //     $product = Product::with(['unit', 'shop.shotSize', 'bottle'])
    //         ->findOrFail($productId);

    //     $unit = $product->unit;

    //     if (!$unit) {
    //         Log::error("Stock Entry Failed: Product ID {$productId} has no unit attached.");
    //         return redirect()->back()->with('error', 'Product configuration error.');
    //     }

    //     // --- UPDATED VERIFICATION LOGIC ---
    //     // Check if the 'bottle' relationship exists (i.e., this product has a related record in the bottles table).
    //     $isBottle = !is_null($product->bottle);

    //     // 3. Perform Conversion Logic
    //     $totalBaseUnitsToAdd = 0;
    //     $quantityEntered = (float) $validated['added_quantity'];

    //     if ($isBottle) {
    //         // --- PATH B: LIQUOR BOTTLES (Verified by relationship existence) ---

    //         // The capacity_ml is stored in the related Bottle model
    //         $bottleVolumeMl = (float) $product->bottle->capacity_ml;

    //         // Get shop's specific shot size (e.g., 30ml)
    //         // Fallback to 30ml if not configured
    //         $shotSizeMl = (float) ($product->shop->shotSize->size_ml ?? 30.0);

    //         if ($bottleVolumeMl <= 0 || $shotSizeMl <= 0) {
    //             Log::error("Stock Entry Failed: Invalid bottle configuration for Product ID {$productId}. Vol: {$bottleVolumeMl}, Shot: {$shotSizeMl}");
    //             return redirect()->back()->with('error', 'Invalid bottle configuration. Check volume and shot size.');
    //         }

    //         // Calculate shots per bottle (e.g., 700 / 30 = 23.33 -> floors to 23)
    //         $shotsPerBottle = $this->converter->convertToShots($bottleVolumeMl, $shotSizeMl);

    //         // Multiply by bottles entered (e.g., 10 bottles * 23 = 230)
    //         // We round to ensure an integer result for the database
    //         $totalBaseUnitsToAdd = (int) round($quantityEntered * $shotsPerBottle);

    //         Log::info("Stock Entry (Bottle Relationship Verified): Added {$quantityEntered} bottles. Vol: {$bottleVolumeMl}ml, Shot: {$shotSizeMl}ml. Calculated {$totalBaseUnitsToAdd} shots.");

    //     } else {
    //         // --- PATH A: STANDARD UNITS (Packs) ---
    //         // Simple multiplication

    //         // Conversion rate is items per pack (e.g., 6)
    //         $itemsPerPack = (float) $unit->conversion_rate;

    //         if ($itemsPerPack <= 0) {
    //             Log::error("Stock Entry Failed: Invalid unit conversion rate for Product ID {$productId}. Rate: {$itemsPerPack}");
    //             return redirect()->back()->with('error', 'Invalid unit configuration. Check conversion rate.');
    //         }

    //         // Multiply packs by rate (e.g., 10 packs * 6 = 60)
    //         // Round to ensure integer
    //         $totalBaseUnitsToAdd = (int) round($quantityEntered * $itemsPerPack);

    //         Log::info("Stock Entry (Unit): Added {$quantityEntered} packs. Rate: {$itemsPerPack}. Calculated {$totalBaseUnitsToAdd} units.");
    //     }


    //     // 4. Retrieve/Create Stock Record
    //     $stock = Stock::firstOrCreate(
    //         ['product_id' => $productId],
    //         ['quantity_on_hand' => 0] // Initialize at 0
    //     );

    //     // 5. Perform the atomic increment
    //     $stock->increment('quantity_on_hand', $totalBaseUnitsToAdd);

    //     // 6. Redirect back
    //     return redirect()->back()->with('success', 'Stock updated successfully.');
    // }


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