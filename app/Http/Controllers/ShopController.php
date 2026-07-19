<?php

namespace App\Http\Controllers;

use App\Models\Shop;
use App\Models\ShotSize;
use App\Enums\ShopType;
use Illuminate\Http\Request;

class ShopController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'shop_type' => 'required',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'allowed_radius' => 'required|integer',
            'size_ml' => 'nullable|required_if:shop_type,bar,restobar|integer',
        ]);

        // Create the shop with coordinates
        $shop = Shop::create([
            'name' => $validated['name'],
            'shop_type' => $validated['shop_type'],
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'allowed_radius' => $validated['allowed_radius'] ?? 100, // Default 100m
        ]);

        // 2. Conditionally create ShotSize for Bar/Restobar
        if (in_array($validated['shop_type'], ['bar', 'restobar'])) {
            ShotSize::create([
                'shop_id' => $shop->id,
                'size_ml' => $validated['size_ml'] ?? 25,
            ]);
        }

        // 3. Link owner
        $request->user()->shopsOwned()->attach($shop->id);

        return redirect()->back()->with('success', 'Shop created successfully.');
    }

    public function updateShotSize(Request $request, Shop $shop)
    {
        // Ensure user owns this shop[cite: 7]
        if (!$request->user()->shopsOwned->contains($shop->id)) {
            abort(403);
        }

        $validated = $request->validate(['size_ml' => 'required|integer']);

        ShotSize::updateOrCreate(
            ['shop_id' => $shop->id],
            ['size_ml' => $validated['size_ml']]
        );

        return back()->with('success', 'Shot size updated.');
    }

    // ShopController.php
    public function getOwnerPortfolio(Request $request)
    {
        // Fetch all shops related to the authenticated owner
        $shops = Shop::where('owner_id', $request->user()->id)->get();

        // You can return just the shops, or include shop_owners/staff data
        return response()->json([
            'shops' => $shops,
            'synced_at' => now()->toDateTimeString(),
        ]);
    }
}