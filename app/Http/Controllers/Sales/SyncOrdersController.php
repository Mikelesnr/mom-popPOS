<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Table;
use App\Models\Product;
// Import the services registered as singletons in AppServiceProvider
use App\Services\UnitDeductionService;
use App\Services\LiquorDeductionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SyncOrdersController extends Controller
{
    /**
     * Sync orders (Sales) from the frontend PWA.
     */
    public function syncOrders(Request $request)
    {
        $request->validate(['orders' => 'required|array']);

        try {
            // Wrap the entire sync process in a database transaction
            // to ensure data integrity.
            return DB::transaction(function () use ($request) {
                foreach ($request->orders as $orderData) {
                    // 1. Update or Create the Order Header
                    // We ensure the original created_at timestamp is preserved from the POS.
                    $order = Order::updateOrCreate(
                        ['id' => $orderData['id']],
                        [
                            'shift_id' => $orderData['shift_id'] ?? null,
                            'user_id' => $orderData['user_id'] ?? null,
                            'total_amount' => $orderData['total_amount'] ?? 0,
                            'payment_method' => $orderData['payment_method'] ?? null,
                            'status' => $orderData['status'],
                            'created_at' => $orderData['created_at'],
                        ]
                    );

                    // 2. Process Items
                    if (!empty($orderData['items'])) {
                        foreach ($orderData['items'] as $itemData) {
                            // Persist item and handle stock deduction, passing the Order context
                            $this->persistOrderItem($order->id, Order::class, $itemData);
                        }
                    }
                }
                return response()->json(['message' => 'Orders synced successfully'], 200);
            });

        } catch (\Exception $e) {
            Log::error('Sync Orders Error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to sync orders.'], 500);
        }
    }

    /**
     * Sync tables (Open tabs) from the frontend PWA.
     * Structure is identical to syncOrders, but uses the Table model.
     */
    public function syncTables(Request $request)
    {
        $request->validate(['tables' => 'required|array']);

        try {
            return DB::transaction(function () use ($request) {
                foreach ($request->tables as $tableData) {
                    // 1. Update or Create Table Header
                    $payment = $tableData['payment_method'] ?? null;
                    $table = Table::updateOrCreate(
                        ['id' => $tableData['id']],
                        [
                            'shift_id' => $tableData['shift_id'] ?? null,
                            'user_id' => $tableData['user_id'] ?? null,
                            'name' => $tableData['name'],
                            'total_amount' => $tableData['total_amount'] ?? 0,
                            'payment_method' => $payment['method'] ?? null,
                            'status' => $tableData['status'],
                            'created_at' => $tableData['created_at'],
                        ]
                    );

                    // 2. Process Items
                    if (!empty($tableData['items'])) {
                        foreach ($tableData['items'] as $itemData) {
                            // Persist item and handle stock deduction, passing the Table context
                            $this->persistOrderItem($table->id, Table::class, $itemData);
                        }
                    }
                }
                return response()->json(['message' => 'Tables synced successfully'], 200);
            });

        } catch (\Exception $e) {
            Log::error('Sync Tables Error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to sync tables.'], 500);
        }
    }

    /**
     * Persists a single order/table item and routes stock deduction.
     */
    protected function persistOrderItem($parentId, $parentType, array $itemData): void
    {
        // 1. Extract Metadata Type from payload
        $rawMetadata = $itemData['metadata'] ?? [];
        $metadata = is_array($rawMetadata) ? $rawMetadata : [];
        // Fallback to 'unit' if type is missing in metadata
        $typeValue = $metadata['type'] ?? (is_string($rawMetadata) ? $rawMetadata : 'unit');

        // 2. Prepare attributes for OrderItem
        $attributes = [
            'id' => $itemData['id'] ?? null,
            'orderable_id' => $parentId,
            'orderable_type' => $parentType,
            'product_id' => $itemData['product_id'] ?? null,
            'name' => $itemData['name'] ?? null,
            'quantity' => $itemData['quantity'] ?? 0,
            'unit_price' => $itemData['unit_price'] ?? 0,
            'subtotal' => $itemData['subtotal'] ?? 0,
            'metadata' => $typeValue, // Save the simplified type string
        ];

        try {
            // a. Save/Update the OrderItem
            // This runs inside the main DB::transaction initialized in syncOrders/syncTables.
            $orderItem = OrderItem::updateOrCreate(['id' => $attributes['id']], $attributes);

            // b. ROUTE STOCK DEDUCTION (Only if product exists)
            if ($orderItem->product_id) {
                $this->routeDeduction($orderItem, $typeValue);
            }

        } catch (\Exception $e) {
            Log::error("Failed to save/deduct item {$attributes['id']}: " . $e->getMessage());
            // Re-throw to trigger transaction rollback in the main sync method
            throw $e;
        }
    }

    /**
     * Determines which service to use based on sale type and invokes deduction.
     * Laravel's Service Container resolves the required singleton services.
     */
    private function routeDeduction(
        OrderItem $item,
        string $saleType,
    ): void {
        $unitService = app(UnitDeductionService::class);
        $liquorService = app(LiquorDeductionService::class);

        switch (strtolower($saleType)) {
            case 'unit':
                $unitService->deduct($item, $saleType);
                break;

            case 'shot':
            case 'double':
            case 'tot':
            case 'bottle':
                $liquorService->deduct($item, $saleType);
                break;

            default:
                Log::warning("Unknown sale type '{$saleType}' for product ID {$item->product_id}. No stock deduction attempted.");
                break;
        }
    }
}