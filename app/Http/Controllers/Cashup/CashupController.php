<?php
namespace App\Http\Controllers\Cashup;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CashupController extends Controller
{
    // Fetch summary for the Z-Slip
    public function show(Request $request, $shiftId)
    {
        // 1. Fetch shift with related shop, orders and tables for receipt branding
        /** @var Shift $shift */
        $shift = Shift::with([
            'shop',
            'orders.user',
            'orders.items',
            'tables.user',
            'tables.items',
        ])
            ->where('id', $shiftId)
            ->whereIn('shop_id', $request->user()->getAccessibleShopIds())
            ->firstOrFail();

        // 2. Use the loaded relations for orders and tables
        $orders = $shift->orders;
        $tables = $shift->tables;

        // 3. Grouping logic
        $byPaymentMethod = $orders->groupBy('payment_method')->map->sum('total_amount');

        $byStaff = $orders->groupBy('user_id')->map(function ($userOrders) {
            return [
                'staff_name' => $userOrders->first()->user->name, // Get name from first order
                'methods' => $userOrders->groupBy('payment_method')->map->sum('total_amount'),
                'orders' => $userOrders // Include orders for detailed receipts
            ];
        });

        return response()->json([
            'shop_name' => $shift->shop->name,
            'shift' => $shift,
            'summary' => [
                'totals_by_method' => $byPaymentMethod,
                'totals_by_staff' => $byStaff,
                'deferred_tables' => $tables->where('status', 'deferred')->map(function ($table) {
                    return [
                        'id' => $table->id,
                        'name' => $table->name,
                        'staff_name' => $table->user->name,
                        'total_amount' => $table->total_amount,
                        'items' => $table->items
                    ];
                })
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

        return DB::transaction(function () use ($request, $shiftId, $validated) {
            // Scoped to the user's accessible shop IDs
            $shift = Shift::where('id', $shiftId)
                ->whereIn('shop_id', $request->user()->getAccessibleShopIds())
                ->firstOrFail();

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

    // Fetch historical cashups
    public function index(Request $request)
    {
        $history = Shift::whereIn('shop_id', $request->user()->getAccessibleShopIds())
            ->whereNotNull('closed_at')
            ->latest()
            ->get();

        return response()->json($history);
    }
}