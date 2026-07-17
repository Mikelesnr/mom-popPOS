<?php

namespace Database\Seeders;

use App\Models\Shop;
use App\Models\Category;
use App\Models\Product;
use App\Models\Bottle;
use App\Models\ShotSize;
use App\Models\Unit;
use App\Models\Stock;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        $shop = Shop::where('shop_type', 'restobar')->first() ?? Shop::first();

        if (!$shop) {
            $this->command->info('No shop found. Seeding stopped.');
            return;
        }

        $this->command->info("Seeding inventory for shop: {$shop->name}");

        // Load Categories
        $categoriesJson = File::get(database_path('data/categories.json'));
        $categories = json_decode($categoriesJson, true);
        foreach ($categories as $categoryData) {
            Category::updateOrCreate(['id' => $categoryData['id']], [
                'shop_id' => $shop->id,
                'name' => $categoryData['name'],
                'slug' => $categoryData['slug'],
            ]);
        }

        // Load Units
        $unitsJson = File::get(database_path('data/units.json'));
        $units = json_decode($unitsJson, true);
        foreach ($units as $unitData) {
            Unit::updateOrCreate(['id' => $unitData['id']], [
                'name' => $unitData['name'],
                'conversion_rate' => $unitData['conversion_rate'],
                'type' => $unitData['type'],
            ]);
        }

        // Load Products
        $productsJson = File::get(database_path('data/products.json'));
        $products = json_decode($productsJson, true);

        $count = 0;
        foreach ($products as $productData) {
            // Create/Update Product with all required fields from JSON
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

            // Calculate Unit Cost and update ProductCost
            $conversionRate = $productData['conversion'] ?? 1;
            $unitCost = $productData['cost_price'] / $conversionRate;

            $product->costDetails()->updateOrCreate(
                ['product_id' => $product->id],
                ['unit_cost' => $unitCost]
            );

            // Attach/Update Bottle Specs
            if (isset($productData['bottle_specs'])) {
                Bottle::updateOrCreate(['product_id' => $product->id], [
                    'is_weighable' => $productData['bottle_specs']['is_weighable'],
                    'capacity_ml' => $productData['bottle_specs']['capacity_ml'],
                    'tare_weight_g' => $productData['bottle_specs']['tare_weight_g'],
                    'gross_weight_g' => $productData['bottle_specs']['gross_weight_g'],
                    'bottle_selling_price' => $productData['bottle_specs']['bottle_selling_price'] ?? null,
                ]);
            }

            // Ensure Stock Record
            Stock::firstOrCreate(
                ['product_id' => $product->id],
                [
                    'quantity_on_hand' => $productData['initial_stock'] ?? 0.000,
                    'count' => 0.000,
                ]
            );

            $count++;
        }
        $this->command->info("{$count} products and their stock levels seeded.");

        // Shot sizes
        ShotSize::firstOrCreate(['shop_id' => $shop->id, 'size_ml' => 25], ['size_ml' => 25]);
    }
}