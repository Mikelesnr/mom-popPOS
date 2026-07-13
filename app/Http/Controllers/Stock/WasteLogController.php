<?php

namespace App\Http\Controllers\Stock;

use App\Http\Controllers\Controller;
use App\Models\WasteLog;
use App\Models\Product;
use App\Models\OrderItem; // Import OrderItem for the fake object
use App\Services\UnitDeductionService;
use App\Services\LiquorDeductionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WasteLogController extends Controller
{
    public function __construct(
        protected UnitDeductionService $unitService,
        protected LiquorDeductionService $liquorService
    ) {
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:255',
            // Validate that the incoming metadata matches your Enum values
            'metadata' => 'required|in:unit,shot,double,bottle',
        ]);

        // Wrap in transaction to ensure log and stock stay in sync
        return DB::transaction(function () use ($validated) {

            // 1. Create the Waste Log record
            // We save the validated 'metadata' string directly to the column
            $wasteLog = WasteLog::create([
                'shop_id' => auth()->user()->shop_id,
                'user_id' => auth()->id(),
                'product_id' => $validated['product_id'],
                'quantity' => $validated['quantity'],
                'reason' => $validated['reason'],
                'metadata' => $validated['metadata'], // Use the correct column name
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