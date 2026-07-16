<?php

namespace App\Http\Controllers\Cashup;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use App\Models\Table;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CashupController extends Controller
{
    // Fetch summary for the Z-Slip
    public function show(Request $request, $shiftId)
    {
        $shift = Shift::where('id', $shiftId)
            ->where('shop_id', $request->header('X-Shop-ID')) // Scoped to shop
            ->firstOrFail();

        $orders = $shift->orders()->get();
        $tables = $shift->tables()->with('orderItems')->get();

        return response()->json([
            'shift' => $shift,
            'summary' => [
                'paid_orders_total' => $orders->sum('total_amount'),
                'closed_tables_total' => $tables->where('status', 'closed')->sum('total_amount'),
                'deferred_tables_total' => $tables->where('status', 'deferred')->sum('total_amount'),
                'deferred_tables' => $tables->where('status', 'deferred'),
            ]
        ]);
    }

    // Finalize the cashup and close the shift
    public function store(Request $request, $shiftId)
    {
        $validated = $request->validate([
            'blind_cash_reported' => 'required|numeric',
            'blind_ecocash_reported' => 'required|numeric',
            'blind_swipe_reported' => 'required|numeric',
            'blind_onemoney_reported' => 'required|numeric',
        ]);

        return DB::transaction(function () use ($shiftId, $validated) {
            $shift = Shift::findOrFail($shiftId);

            $shift->update([
                'closed_at' => now(),
                'blind_cash_reported' => $validated['blind_cash_reported'],
                'blind_ecocash_reported' => $validated['blind_ecocash_reported'],
                'blind_swipe_reported' => $validated['blind_swipe_reported'],
                'blind_onemoney_reported' => $validated['blind_onemoney_reported'],
            ]);

            return response()->json(['message' => 'Shift closed successfully', 'shift' => $shift]);
        });
    }
}