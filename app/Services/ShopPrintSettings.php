<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Shop;
use Illuminate\Support\Facades\Cache;

/**
 * The few shop settings that decide what gets printed where, delivered to every
 * device with its regular device poll (see DeviceSignalController).
 *
 *  - auto_print_receipts: print the customer receipt when an order or table is paid
 *  - kitchen_category_ids: categories whose items go to the kitchen printer
 *  - bar_category_ids: categories whose items print a bar slip on the bar printer
 *
 * Cached briefly because devices ask every few seconds. Anything that changes
 * these values must call forget().
 */
class ShopPrintSettings
{
    private const TTL_SECONDS = 60;

    public static function for(string $shopId): array
    {
        return Cache::remember(self::key($shopId), self::TTL_SECONDS, function () use ($shopId) {
            return [
                'auto_print_receipts' => (bool) Shop::query()->whereKey($shopId)->value('auto_print_receipts'),
                'kitchen_category_ids' => Category::query()
                    ->where('shop_id', $shopId)
                    ->where('is_kitchen', true)
                    ->pluck('id')
                    ->values()
                    ->all(),
                'bar_category_ids' => Category::query()
                    ->where('shop_id', $shopId)
                    ->where('is_bar', true)
                    ->pluck('id')
                    ->values()
                    ->all(),
            ];
        });
    }

    public static function forget(string $shopId): void
    {
        Cache::forget(self::key($shopId));
    }

    private static function key(string $shopId): string
    {
        return "shop:{$shopId}:print-settings";
    }
}
