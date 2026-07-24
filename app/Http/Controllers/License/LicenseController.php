<?php

namespace App\Http\Controllers\License;

use App\Http\Controllers\Controller;
use App\Models\ShopLicense;
use Illuminate\Http\Request;

class LicenseController extends Controller
{
    /**
     * Lightweight status check - called at login and periodically during sync
     * so a device that stays logged in for weeks doesn't run on a stale flag.
     *
     * GET /license/status?shopId=...
     */
    public function status(Request $request)
    {
        $validated = $request->validate([
            'shopId' => 'required',
        ]);

        $license = ShopLicense::where('shop_id', $validated['shopId'])->first();

        // No license row yet = treat as paid (grace period for shops onboarded
        // before this feature existed, or newly created shops you haven't billed yet).
        if (!$license) {
            return response()->json([
                'paid_status' => true,
                'expires_at' => null,
                'days_remaining' => null,
            ]);
        }

        return response()->json([
            'paid_status' => $license->isCurrentlyValid(),
            'expires_at' => $license->expiresAt()->toDateString(),
            'days_remaining' => $license->daysRemaining(),
        ]);
    }

    /**
     * Admin-only: create or update a shop's license.
     * Gate this route behind your system_admin role middleware.
     *
     * PATCH /license/{shopId}
     */
    public function update(Request $request, string $shopId)
    {
        $validated = $request->validate([
            'paid_date' => 'required|date',
            'duration_days' => 'required|integer|min:1',
            'paid_status' => 'required|boolean',
            'notes' => 'nullable|string',
        ]);

        $license = ShopLicense::updateOrCreate(
            ['shop_id' => $shopId],
            $validated
        );

        return response()->json([
            'license' => $license,
            'is_currently_valid' => $license->isCurrentlyValid(),
        ]);
    }
}