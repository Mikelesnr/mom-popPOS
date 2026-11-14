<?php

namespace App\Http\Controllers;

use App\Models\Shop;
use App\Models\User;
use App\Models\ShotSize;
use App\Enums\ShopType;
use App\Services\RegionAvailabilityChecker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Enum;

class ShopController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'shop_type'     => ['required', new Enum(ShopType::class)],
            'latitude'      => 'required|numeric',
            'longitude'     => 'required|numeric',
            'allowed_radius' => 'nullable|integer',
            'size_ml'       => 'nullable|required_if:shop_type,' . ShopType::BAR->value . ',' . ShopType::RESTOBAR->value . '|integer',
        ]);

        if (!RegionAvailabilityChecker::isWithinZimbabwe($validated['latitude'], $validated['longitude'])) {
            return back()
                ->withInput()
                ->withErrors([
                    'latitude' => "Mom & Pop POS is currently only available in Zimbabwe. "
                        . "If you're interested in a version for your country, reach out via WhatsApp or email on the homepage.",
                ]);
        }

        $shop = Shop::create([
            'name'          => $validated['name'],
            'shop_type'     => $validated['shop_type'],
            'latitude'      => $validated['latitude'],
            'longitude'     => $validated['longitude'],
            'allowed_radius' => $validated['allowed_radius'] ?? 100,
        ]);

        // Conditionally create ShotSize for Bar/Restobar
        if (in_array($validated['shop_type'], [ShopType::BAR->value, ShopType::RESTOBAR->value], true)) {
            ShotSize::create([
                'shop_id' => $shop->id,
                'size_ml' => $validated['size_ml'] ?? 25,
            ]);
        }

        $request->user()->shopsOwned()->attach($shop->id);

        return redirect()->back()->with('success', 'Shop created successfully.');
    }

    public function updateShotSize(Request $request, Shop $shop)
    {
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

    public function getOwnerPortfolio(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();
        $shops = $user->shopsOwned()->get()->values();

        return response()->json([
            'shops'     => $shops,
            'synced_at' => now()->toDateTimeString(),
        ]);
    }
}
