<?php

namespace App\Http\Controllers\Cashup;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use App\Models\PaymentMethod;
use App\Models\ShiftPayment;
use App\Models\Table;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class CashupController extends Controller
{
    // Fetch summary for the Z-Slip
    public function show(Request $request, $shiftId)
    {
        try {
            // 1. Fetch shift
            $shift = Shift::with([
                'shop',
                'orders.user',
                'orders.items',
                'tables.user',
                'tables.items',
                'wasteLogs.product',
                'expenses',
                'payments.paymentMethod'
            ])
                ->where('id', $shiftId)
                ->whereIn('shop_id', $request->user()->getAccessibleShopIds())
                ->firstOrFail();

            // 2. Separate transactions by status
            $orders = $shift->orders ?? collect();
            $tables = $shift->tables ?? collect();

            $closedTables = $tables->where('status', 'closed');
            $deferredTables = $tables->where('status', 'deferred');
            $voidedTables = $tables->where('status', 'void');

            // 3. Combine settled transactions
            $allSettledTransactions = $orders->merge($closedTables);

            // 4. Calculate grouped totals
            $byPaymentMethod = $allSettledTransactions->groupBy('payment_method')->map->sum('total_amount');

            $byStaff = $allSettledTransactions->groupBy('user_id')->map(function ($transactions) {
                return [
                    'staff_name' => $transactions->first()->user->name ?? 'Unknown',
                    'methods' => $transactions->groupBy('payment_method')->map->sum('total_amount'),
                    'transactions' => $transactions
                ];
            });

            // 5. Return JSON
            return response()->json([
                'shop_name' => $shift->shop->name,
                'shift' => $shift,
                'summary' => [
                    'totals_by_method' => $byPaymentMethod,
                    'totals_by_staff' => $byStaff,
                    'deferred_tables' => $deferredTables->map(fn($t) => ['id' => $t->id, 'name' => $t->name, 'staff_name' => $t->user->name ?? 'Unknown', 'total_amount' => $t->total_amount, 'items' => $t->items]),
                    'voided_tables' => $voidedTables->map(fn($t) => ['id' => $t->id, 'name' => $t->name, 'staff_name' => $t->user->name ?? 'Unknown', 'total_amount' => $t->total_amount, 'items' => $t->items])
                ]
            ]);

        } catch (Exception $e) {
            // This catches the error and sends it to the frontend instead of a 500 page
            Log::error("CashupController Show Error: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to load cashup data',
                'details' => $e->getMessage(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    // Finalize the cashup and close the shift
    public function store(Request $request, $shiftId)
    {
        // 1. Validate that we received an array of totals (slug => amount)
        $validated = $request->validate([
            'totals' => 'required|array',
            'totals.*' => 'numeric',
        ]);

        return DB::transaction(function () use ($request, $shiftId, $validated) {
            // 2. Fetch the shift within the user's scope
            $shift = Shift::where('id', $shiftId)
                ->whereIn('shop_id', $request->user()->getAccessibleShopIds())
                ->firstOrFail();

            // 3. Mark the shift as closed
            $shift->update([
                'closed_at' => now(),
            ]);

            // 4. Retrieve all relevant PaymentMethods in one query
            $slugs = array_keys($validated['totals']);
            $paymentMethods = PaymentMethod::whereIn('slug', $slugs)->get()->keyBy('slug');

            // 5. Create a ShiftPayment entry for each provided total
            foreach ($validated['totals'] as $slug => $amount) {
                if ($paymentMethods->has($slug)) {
                    ShiftPayment::create([
                        'shift_id' => $shift->id,
                        'payment_method_id' => $paymentMethods[$slug]->id,
                        'amount' => $amount,
                    ]);
                } else {
                    // Log an error if a sent slug doesn't exist in the database
                    Log::warning("Attempted to record shift payment for unknown method: {$slug}");
                }
            }

            return response()->json([
                'message' => 'Shift closed successfully',
                'shift' => $shift
            ]);
        });
    }

    public function closeTable(Request $request, $tableId)
    {
        $request->validate([
            'method' => 'required|string',
            'current_shift_id' => 'required|uuid|exists:shifts,id',
        ]);

        return DB::transaction(function () use ($request, $tableId) {
            $table = Table::findOrFail($tableId);

            $table->update([
                'status' => 'closed',
                'payment_method' => $request->input('method'),
                'shift_id' => $request->current_shift_id,
            ]);

            return response()->json(['message' => 'Table closed successfully']);
        });
    }

    public function index(Request $request)
    {
        $history = Shift::whereIn('shop_id', $request->user()->getAccessibleShopIds())
            ->whereNotNull('closed_at')
            ->latest()
            ->get();

        return response()->json($history);
    }
}