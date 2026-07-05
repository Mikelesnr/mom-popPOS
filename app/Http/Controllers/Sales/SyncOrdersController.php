<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Stock;
use App\Models\Product; 
use App\Models\Bottle; 
use App\models\Wastelog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SyncOrdersController extends Controller
{
    public function syncOrders(Request $request)
    {
        $request->validate([
            'orders' => 'required|array',
        ]);

        return DB::transaction(function () use ($request) {
            foreach ($request->orders as $orderData) {
                // 1. Idempotent Order Creation
                $order = Order::firstOrCreate(
                    ['id' => $orderData['id']],
                    [
                        'shift_id' => $orderData['shift_id'],
                        'table_id' => $orderData['table_id'] ?? null,
                        'total_amount' => $orderData['total_amount'],
                        'payment_method' => $orderData['payment_method'],
                        'status' => $orderData['status'],
                    ]
                );

                // 2. Process Items
                foreach ($orderData['items'] as $itemData) {
                    $orderItem = OrderItem::firstOrCreate(
                        ['id' => $itemData['id']],
                        [
                            'order_id' => $order->id,
                            'product_id' => $itemData['product_id'],
                            'quantity' => $itemData['quantity'],
                            'unit_price' => $itemData['unit_price'],
                            'subtotal' => $itemData['subtotal'],
                        ]
                    );

                    // 3. Volumetric Deduction Logic
                    // Check if the product has a bottle (this requires loading the product relationship)
                    $product = Product::with('bottle')->find($itemData['product_id']);
                    
                    if ($product && $product->bottle) {
                        // The frontend sends metadata explaining what happened
                        $metadata = json_decode($itemData['metadata'], true); 

                        // Determine the actual inventory deduction (the quantity column handles this)
                        $deductionVolume = $itemData['quantity']; 

                        // --- CORE DEDUCTION ---
                        Stock::where('product_id', $product->id)
                             ->decrement('quantity', $deductionVolume);

                        // --- OPTIONAL: ADVANCED VARIANCE LOGGING ---
                        // If the sale was "custom shots" or "bottle", we might want to track variance
                        // against the standard 30ml pour if the shop sets that as the baseline.
                        if ($metadata['type'] === 'custom_shots') {
                            $standardShotML = 30; 
                            $actualPourTotalML = $metadata['num_shots'] * $standardShotML;
                            // This is complex logic, but this is where it would live.
                            // Example: If variance > 0, log it as waste.
                        }
                    }
                }
            }

            return response()->json(['message' => 'Sync successful'], 200);
        });
    }
}