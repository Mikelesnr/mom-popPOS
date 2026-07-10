<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Table;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Log;

class SyncOrdersController extends Controller
{
    public function syncOrders(Request $request)
    {
        $request->validate(['orders' => 'required|array']);

        try {
            DB::transaction(function () use ($request) {
                foreach ($request->orders as $orderData) {
                    // DEBUG: Print data to terminal before creation
                    error_log("--- SYNCING ORDER: " . $orderData['id'] . " ---");
                    error_log(print_r($orderData, true));

                    $order = Order::updateOrCreate(
                        ['id' => $orderData['id']],
                        [
                            'shift_id' => $orderData['shift_id'],
                            'user_id' => $orderData['user_id'],
                            'total_amount' => $orderData['total_amount'],
                            'payment_method' => $orderData['payment_method'],
                            'status' => $orderData['status'],
                        ]
                    );

                    if (!empty($orderData['items'])) {
                        error_log("DEBUG: Found " . count($orderData['items']) . " items for record " . $orderData['id']);
                        foreach ($orderData['items'] as $itemData) {
                            $this->persistOrderItem($order->id, Order::class, $itemData);
                        }
                    } else {
                        error_log("DEBUG: NO items found in payload for record " . $orderData['id']);
                    }
                }
            });
            return response()->json(['message' => 'Orders synced successfully'], 200);
        } catch (\Exception $e) {
            error_log("SYNC ORDERS FAILED: " . $e->getMessage()); // Print error to terminal
            Log::error('Sync Orders Error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function syncTables(Request $request)
    {
        $request->validate(['tables' => 'required|array']);

        try {
            return DB::transaction(function () use ($request) {
                foreach ($request->tables as $tableData) {
                    // DEBUG: Print data to terminal before creation
                    error_log("--- SYNCING TABLE: " . $tableData['id'] . " ---");
                    error_log(print_r($tableData, true));
                    // Add this inside your item foreach loop

                    $table = Table::updateOrCreate(
                        ['id' => $tableData['id']],
                        [
                            'shift_id' => $tableData['shift_id'],
                            'user_id' => $tableData['user_id'],
                            'name' => $tableData['name'],
                            'total_amount' => $tableData['total_amount'],
                            'payment_method' => $tableData['payment_method'] ?? null,
                            'status' => $tableData['status'],
                        ]
                    );

                    if (!empty($tableData['items'])) {
                        error_log("DEBUG: Found " . count($tableData['items']) . " items for record " . $tableData['id']);
                        foreach ($tableData['items'] as $itemData) {
                            $this->persistOrderItem($table->id, Table::class, $itemData);
                        }
                    } else {
                        error_log("DEBUG: NO items found in payload for record " . $tableData['id']);
                    }
                }
                return response()->json(['message' => 'Tables synced successfully'], 200);
            });
        } catch (\Exception $e) {
            error_log("SYNC TABLES FAILED: " . $e->getMessage()); // Print error to terminal
            Log::error('Sync Tables Error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to sync tables.'], 500);
        }
    }


    protected function persistOrderItem($parentId, $parentType, array $itemData): void
    {
        error_log("DEBUG: Full itemData dump:\n" . var_export($itemData, true));
        error_log("DEBUG: ItemData keys: " . implode(', ', array_keys($itemData)));

        $rawMetadata = $itemData['metadata'] ?? 'METADATA_MISSING';
        error_log("DEBUG: Raw metadata before extraction:\n" . var_export($rawMetadata, true));

        $metadata = is_array($rawMetadata) ? $rawMetadata : [];
        $typeValue = $metadata['type'] ?? (is_string($rawMetadata) ? $rawMetadata : 'unit');

        $attributes = [
            'id' => $itemData['id'] ?? null,
            'orderable_id' => $itemData['orderable_id'],
            'orderable_type' => $parentType,
            'product_id' => $itemData['product_id'] ?? null,
            'name' => $itemData['name'] ?? null,
            'quantity' => $itemData['quantity'] ?? 0,
            'unit_price' => $itemData['unit_price'] ?? 0,
            'subtotal' => $itemData['subtotal'] ?? 0,
            'metadata' => $typeValue,
        ];

        error_log("DEBUG: Attributes prepared for save:\n" . var_export($attributes, true));

        try {
            OrderItem::updateOrCreate(['id' => $attributes['id']], $attributes);
            error_log("✅ SUCCESS: Saved item " . $attributes['id']);
        } catch (QueryException $qe) {
            error_log("❌ QUERY ERROR: " . $qe->getMessage());
            error_log("❌ SQL: " . $qe->getSql());
            error_log("❌ Bindings: " . json_encode($qe->getBindings()));
            error_log("❌ FULL STACK TRACE: " . $qe->getTraceAsString());
        } catch (\Exception $e) {
            error_log("❌ ERROR: Failed to save item " . ($attributes['id'] ?? 'unknown') . ": " . $e->getMessage());
            error_log("❌ FULL STACK TRACE: " . $e->getTraceAsString());
        }
    }

}