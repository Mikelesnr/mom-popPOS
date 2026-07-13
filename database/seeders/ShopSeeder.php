<?php

namespace Database\Seeders;

use App\Models\Shop;
use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ShopSeeder extends Seeder
{
    public function run(): void
    {
        $json = File::get(database_path('data/shops.json'));
        $shops = json_decode($json, true);

        foreach ($shops as $shopData) {
            $shop = Shop::updateOrCreate(['id' => $shopData['id']], $shopData);

            // Populate layout configurations relative to specific business operations
            if ($shop->shop_type === 'restobar') {
                $categories = ['Liquors', 'Wines', 'Whiskey', 'Brandy', 'Shots', 'Steaks', 'Mains', 'Desserts'];
            } else {
                $categories = ['Groceries', 'Beverages', 'Bakery', 'Toiletries', 'Confectionery'];
            }

            foreach ($categories as $catName) {
                Category::firstOrCreate([
                    'shop_id' => $shop->id,
                    'name' => $catName,
                ], [
                    // Explicitly pass the slug here so MySQL gets it instantly on insertion
                    'slug' => Str::slug($catName),
                ]);
            }
        }
    }
}