<?php

namespace App\Http\Controllers;

use App\Models\Shop;
use Illuminate\Http\Request;

class ShopController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'shop_type' => 'required',
        ]);

        // Create the shop
        $shop = Shop::create($request->only(['name', 'shop_type']));

        // Link the current user as an owner
        $request->user()->shopsOwned()->attach($shop->id);

        return redirect()->route('dashboard')->with('success', 'Shop created successfully.');
    }

    public function update(Request $request, Shop $shop)
    {
        // Authorization: Ensure the user actually owns this shop
        if (!$request->user()->shopsOwned->contains($shop->id)) {
            abort(403);
        }

        $shop->update($request->validate(['name' => 'string']));
        return back()->with('success', 'Shop updated.');
    }
}