<?php

namespace Database\Seeders;

use App\Models\Shop;
use App\Models\Category;
use App\Models\Product;
use App\Models\Bottle;
use App\Models\ShotSize;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        // 1. Grab your target storefront layout context (Avondale Restobar Edge)
        $shop = Shop::where('shop_type', 'restobar')->first() ?? Shop::first();

        if (!$shop) {
            return;
        }

        // 2. Load and Seed Categories from JSON
        $categoriesJson = File::get(database_path('data/categories.json'));
        $categories = json_decode($categoriesJson, true);

        foreach ($categories as $categoryData) {
            Category::updateOrCreate(
                ['id' => $categoryData['id']],
                [
                    'shop_id' => $shop->id,
                    'name'    => $categoryData['name'],
                    'slug'    => $categoryData['slug'],
                ]
            );
        }

        // 3. Load and Seed Products & Bottles from JSON
        $productsJson = File::get(database_path('data/products.json'));
        $products = json_decode($productsJson, true);

        foreach ($products as $productData) {
            $product = Product::updateOrCreate(
                ['id' => $productData['id']],
                [
                    'shop_id'       => $shop->id,
                    'category_id'   => $productData['category_id'],
                    'name'          => $productData['name'],
                    'cost_price'    => $productData['cost_price'],
                    'selling_price' => $productData['selling_price'],
                    'is_perishable' => $productData['is_perishable'],
                ]
            );

            // If the item contains sub-bottle fluid metrics (Spirits), attach the record
            if (isset($productData['bottle_specs'])) {
                Bottle::updateOrCreate(
                    ['product_id' => $product->id],
                    [
                        'is_weighable'   => $productData['bottle_specs']['is_weighable'],
                        'capacity_ml'    => $productData['bottle_specs']['capacity_ml'],
                        'tare_weight_g'  => $productData['bottle_specs']['tare_weight_g'],
                        'gross_weight_g' => $productData['bottle_specs']['gross_weight_g'],
                    ]
                );
            }
        }

        // 4. Populate standard multi-tenant uniform pour requirements
        $shotSizes = [
            ['name' => 'Single Pour', 'size_ml' => 25],
            ['name' => 'Double Pour', 'size_ml' => 50],
        ];

        foreach ($shotSizes as $shot) {
            ShotSize::firstOrCreate(
                [
                    'shop_id' => $shop->id,
                    'name'    => $shot['name']
                ],
                [
                    'size_ml' => $shot['size_ml']
                ]
            );
        }
    }
}