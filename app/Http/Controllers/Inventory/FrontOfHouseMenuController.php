<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryMenuResource;
use App\Models\Category;
use App\Models\ShotSize;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FrontOfHouseMenuController extends Controller
{
    /**
     * Fetch the full shop menu for local synchronization and IndexedDB caching.
     */
    public function syncCatalog(Request $request): JsonResponse
    {
        $shopId = $request->user()->shop_id;

        if (!$shopId) {
            return response()->json([
                'message' => 'No active workplace shop assignment associated with this session.'
            ], 400);
        }

        // 1. Fetch all categories and eager load products with their bottle specs
        $categories = Category::where('shop_id', $shopId)
            ->with([
                'products' => function ($query) {
                    $query->with('bottle')
                        ->with('unit')
                        ->with('stock');
                }
            ])
            ->get();

        // 2. Fetch all standard shot-pour configurations for this shop
        $shotSizes = ShotSize::where('shop_id', $shopId)->get();

        return response()->json([
            'shop_id' => $shopId,
            'synced_at' => now()->toIso8601String(),
            'menu' => CategoryMenuResource::collection($categories),
            'shot_sizes' => $shotSizes->map(function ($shot) {
                return [
                    'id' => $shot->id,
                    'size_ml' => $shot->size_ml,
                ];
            }),
        ]);
    }
}