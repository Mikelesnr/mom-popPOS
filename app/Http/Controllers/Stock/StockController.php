<?php

namespace App\Http\Controllers\Stock;

use App\Http\Controllers\Controller;
use App\Models\Stock;
use Illuminate\Http\Request;
use App\Services\UnitProductCreator;
use App\Services\BottleProductCreator;
use App\Services\ProductUpdater;
use App\Models\Product;
use Illuminate\Validation\Rule;

class StockController extends Controller
{
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

    public function update(
        Request $request,
        string $id,
        ProductUpdater $updater // Injected via the service container
    ) {
        $product = Product::findOrFail($id);

        // Validation with unique ignore rule to allow keeping current name
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                Rule::unique('products')->ignore($product->id)
            ],
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

        // Use the registered singleton instance
        $updater->update($product, $validated);

        return response()->json($product);
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