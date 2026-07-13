<?php

namespace App\Http\Controllers\Stock;

use App\Http\Controllers\Controller;
use App\Models\Stock;
use Illuminate\Http\Request;
use App\Services\UnitProductCreator;
use App\Services\BottleProductCreator;
use App\Services\ProductUpdater;
use App\Services\BottleProductUpdater;
use App\Services\InventoryConverter;
use App\Models\Product;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;

class StockController extends Controller
{
    /**
     * Inject the converter service via the controller constructor.
     */
    public function __construct(
        protected InventoryConverter $converter
    ) {
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
    public function updateStock(Request $request, string $productId)
    {
        // 1. Validate input. User enters number of packs or bottles (can be decimal, e.g., 0.5 case).
        $validated = $request->validate([
            'added_quantity' => 'required|numeric|min:0.01',
        ]);

        // 2. Fetch product, its unit, shop shot size, AND the related bottle record.
        // We use eager loading to optimize queries.
        $product = Product::with(['unit', 'shop.shotSize', 'bottle'])
            ->findOrFail($productId);

        $unit = $product->unit;

        if (!$unit) {
            Log::error("Stock Entry Failed: Product ID {$productId} has no unit attached.");
            return redirect()->back()->with('error', 'Product configuration error.');
        }

        // --- UPDATED VERIFICATION LOGIC ---
        // Check if the 'bottle' relationship exists (i.e., this product has a related record in the bottles table).
        $isBottle = !is_null($product->bottle);

        // 3. Perform Conversion Logic
        $totalBaseUnitsToAdd = 0;
        $quantityEntered = (float) $validated['added_quantity'];

        if ($isBottle) {
            // --- PATH B: LIQUOR BOTTLES (Verified by relationship existence) ---

            // The capacity_ml is stored in the related Bottle model
            $bottleVolumeMl = (float) $product->bottle->capacity_ml;

            // Get shop's specific shot size (e.g., 30ml)
            // Fallback to 30ml if not configured
            $shotSizeMl = (float) ($product->shop->shotSize->size_ml ?? 30.0);

            if ($bottleVolumeMl <= 0 || $shotSizeMl <= 0) {
                Log::error("Stock Entry Failed: Invalid bottle configuration for Product ID {$productId}. Vol: {$bottleVolumeMl}, Shot: {$shotSizeMl}");
                return redirect()->back()->with('error', 'Invalid bottle configuration. Check volume and shot size.');
            }

            // Calculate shots per bottle (e.g., 700 / 30 = 23.33 -> floors to 23)
            $shotsPerBottle = $this->converter->convertToShots($bottleVolumeMl, $shotSizeMl);

            // Multiply by bottles entered (e.g., 10 bottles * 23 = 230)
            // We round to ensure an integer result for the database
            $totalBaseUnitsToAdd = (int) round($quantityEntered * $shotsPerBottle);

            Log::info("Stock Entry (Bottle Relationship Verified): Added {$quantityEntered} bottles. Vol: {$bottleVolumeMl}ml, Shot: {$shotSizeMl}ml. Calculated {$totalBaseUnitsToAdd} shots.");

        } else {
            // --- PATH A: STANDARD UNITS (Packs) ---
            // Simple multiplication

            // Conversion rate is items per pack (e.g., 6)
            $itemsPerPack = (float) $unit->conversion_rate;

            if ($itemsPerPack <= 0) {
                Log::error("Stock Entry Failed: Invalid unit conversion rate for Product ID {$productId}. Rate: {$itemsPerPack}");
                return redirect()->back()->with('error', 'Invalid unit configuration. Check conversion rate.');
            }

            // Multiply packs by rate (e.g., 10 packs * 6 = 60)
            // Round to ensure integer
            $totalBaseUnitsToAdd = (int) round($quantityEntered * $itemsPerPack);

            Log::info("Stock Entry (Unit): Added {$quantityEntered} packs. Rate: {$itemsPerPack}. Calculated {$totalBaseUnitsToAdd} units.");
        }


        // 4. Retrieve/Create Stock Record
        $stock = Stock::firstOrCreate(
            ['product_id' => $productId],
            ['quantity_on_hand' => 0] // Initialize at 0
        );

        // 5. Perform the atomic increment
        $stock->increment('quantity_on_hand', $totalBaseUnitsToAdd);

        // 6. Redirect back
        return redirect()->back()->with('success', 'Stock updated successfully.');
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
}