<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Shop;
use Illuminate\Support\Facades\Auth;

class ShopController extends Controller
{
    public function create()
    {
        return Inertia::render('Shop/Create');
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        Shop::create([
            'name' => $request->name,
            'owner_id' => Auth::id(),
        ]);

        return redirect()->route('dashboard')->with('status', 'Shop created successfully!');
    }

    public function destroy(Shop $shop)
    {
        $shop->delete();

        return redirect()->route('dashboard')->with('status', 'Shop deleted successfully!');
    }
}
