<?php

namespace App\Http\Controllers\Stock;

use App\Http\Controllers\Controller;
use App\Models\WasteLog;
use App\Models\Shift;
use App\Models\Product;
use App\Models\OrderItem; // Import OrderItem for the fake object
use App\Services\UnitDeductionService;
use App\Services\LiquorDeductionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class WasteLogController extends Controller
{
    public function __construct(
        protected UnitDeductionService $unitService,
        protected LiquorDeductionService $liquorService
    ) {
    }

    public function store(Request $request)
    {
        // Validate request input first
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id', // This provides basic exists validation
            'quantity' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:255',
            'metadata' => 'required|in:unit,shot,double,bottle',
        ]);

        // Explicitly check for product existence to be safe
        $product = Product::find($validated['product_id']);
        if (!$product) {
            return redirect()->back()->withErrors(['product_id' => 'The selected product does not exist.']);
        }

        // 1. Get current active shift
        $activeShift = Shift::where('shop_id', Auth::user()->shop_id)
            ->whereNull('closed_at')
            ->latest()
            ->firstOrFail();

        return DB::transaction(function () use ($validated, $activeShift) {
            // 2. Create the Waste Log record scoped to shift
            $wasteLog = WasteLog::create([
                'shift_id' => $activeShift->id, // Use active shift ID
                'user_id' => Auth::id(),
                'product_id' => $validated['product_id'],
                'quantity' => $validated['quantity'],
                'reason' => $validated['reason'],
                'metadata' => $validated['metadata'],
            ]);

            // 2. Route to the correct deduction service
            // We need a fake OrderItem object to satisfy the service contract
            // The service itself will handle casting the metadata string to the Enum.
            $fakeOrderItem = new OrderItem([
                'product_id' => $validated['product_id'],
                'quantity' => $validated['quantity'],
                'metadata' => $validated['metadata'], // Pass the metadata along
            ]);

            // Use the exact same logic from SyncOrdersController
            // The service will check $item->metadata (which is now an Enum)
            switch ($validated['metadata']) {
                case 'unit':
                    $this->unitService->deduct($fakeOrderItem, 'unit');
                    break;

                case 'shot':
                case 'double':
                case 'bottle':
                    // LiquorDeductionService handles the math for all liquor types
                    $this->liquorService->deduct($fakeOrderItem, $validated['metadata']);
                    break;
            }

            return redirect()->back()->with('success', 'Waste log created and stock updated successfully.');
        });
    }
}