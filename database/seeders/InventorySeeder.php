<?php

namespace Database\Seeders;

use App\Models\Shop;
use App\Models\Category;
use App\Models\Product;
use App\Models\Bottle;
use App\Models\ShotSize;
use App\Models\Unit;
use App\Models\Stock; // <-- Import the Stock model
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        // 1. Grab your target storefront layout context
        $shop = Shop::where('shop_type', 'restobar')->first() ?? Shop::first();

        if (!$shop) {
            $this->command->info('No shop found. Seeding stopped.');
            return;
        }

        $this->command->info("Seeding inventory for shop: {$shop->name}");

        // 2. Load and Seed Categories
        $categoriesJson = File::get(database_path('data/categories.json'));
        $categories = json_decode($categoriesJson, true);

        foreach ($categories as $categoryData) {
            Category::updateOrCreate(
                ['id' => $categoryData['id']],
                [
                    'shop_id' => $shop->id,
                    'name' => $categoryData['name'],
                    'slug' => $categoryData['slug'],
                ]
            );
        }
        $this->command->info('Categories seeded.');

        // 3. Load and Seed Units
        $unitsJson = File::get(database_path('data/units.json'));
        $units = json_decode($unitsJson, true);

        foreach ($units as $unitData) {
            Unit::updateOrCreate(
                ['id' => $unitData['id']],
                [
                    'name' => $unitData['name'],
                    'conversion_rate' => $unitData['conversion_rate'],
                    'type' => $unitData['type'],
                ]
            );
        }
        $this->command->info('Units seeded.');

        // 4. Load and Seed Products, Bottles, and INITIAL STOCK
        $productsJson = File::get(database_path('data/products.json'));
        $products = json_decode($productsJson, true);

        $count = 0;
        foreach ($products as $productData) {
            // Ensure required foreign keys exist to prevent integrity errors during development
            if (!Category::find($productData['category_id'])) {
                $this->command->warn("Skipping product {$productData['name']} because category_id {$productData['category_id']} does not exist.");
                continue;
            }
            if (!Unit::find($productData['unit_id'])) {
                $this->command->warn("Skipping product {$productData['name']} because unit_id {$productData['unit_id']} does not exist.");
                continue;
            }

            $product = Product::updateOrCreate(
                ['id' => $productData['id']],
                [
                    'shop_id' => $shop->id,
                    'category_id' => $productData['category_id'],
                    'unit_id' => $productData['unit_id'],
                    'name' => $productData['name'],
                    'cost_price' => $productData['cost_price'],
                    'selling_price' => $productData['selling_price'],
                    'is_perishable' => $productData['is_perishable'] ?? false,
                ]
            );

            // Attach/Update Bottle Specs if applicable
            if (isset($productData['bottle_specs'])) {
                Bottle::updateOrCreate(
                    ['product_id' => $product->id],
                    [
                        'is_weighable' => $productData['bottle_specs']['is_weighable'],
                        'capacity_ml' => $productData['bottle_specs']['capacity_ml'],
                        'tare_weight_g' => $productData['bottle_specs']['tare_weight_g'],
                        'gross_weight_g' => $productData['bottle_specs']['gross_weight_g'],
                        'bottle_selling_price' => $productData['bottle_specs']['bottle_selling_price'] ?? null,
                    ]
                );
            }

            // --- MODIFICATION START: Ensure Stock Record Exists ---
            // Using firstOrCreate ensures we don't reset stock if the seeder runs twice,
            // but guarantees a record exists for the API resource.
            Stock::firstOrCreate(
                [
                    'product_id' => $product->id,
                ],
                [
                    // Set a default initial quantity for development/testing.
                    // You can adjust this based on product type if needed.
                    'quantity_on_hand' => $productData['initial_stock'] ?? 0.000,
                    'count' => 0.000, // Initialize audit count to 0
                ]
            );
            // --- MODIFICATION END ---

            $count++;
        }
        $this->command->info("{$count} products and their stock levels seeded.");

        // 5. Populate standard uniform pour requirements
        $shotSizes = [
            ['size_ml' => 25],
            // Add other standard sizes if needed, e.g., ['size_ml' => 35]
        ];

        foreach ($shotSizes as $shot) {
            ShotSize::firstOrCreate(
                [
                    'shop_id' => $shop->id,
                    'size_ml' => $shot['size_ml'], // Ensure uniqueness by size per shop
                ],
                [
                    'size_ml' => $shot['size_ml']
                ]
            );
        }
        $this->command->info('Shot sizes seeded.');
    }
}