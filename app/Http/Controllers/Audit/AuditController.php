<?php

namespace App\Http\Controllers\Audit;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use App\Models\StockVariance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AuditController extends Controller
{
    /**
     * Main endpoint to retrieve and aggregate shift and variance data.
     */
    public function getAuditData(Request $request)
    {
        try {
            $validated = $request->validate([
                'shopId' => 'required',
                'startDate' => 'required|date',
                'endDate' => 'required|date',
            ]);

            $start = $validated['startDate'] . ' 00:00:00';
            $end = $validated['endDate'] . ' 23:59:59';

            // 1. Fetch Data
            $shifts = Shift::where('shop_id', $validated['shopId'])
                ->whereBetween('created_at', [$start, $end])
                ->whereNotNull('closed_at')
                ->with([
                    'staff',
                    'orders.items.product.costDetails',
                    'tables.items.product.costDetails',
                    'wasteLogs.product'
                ])
                ->get();

            $variances = StockVariance::whereBetween('created_at', [$start, $end])
                ->whereHas('product', fn($q) => $q->where('shop_id', $validated['shopId']))
                ->with('product.costDetails')
                ->get();

            // 2. Process Data
            $shiftMap = $this->processShifts($shifts);
            $this->processVariances($variances, $shiftMap);

            // 3. Format Data
            $formattedData = $this->formatAuditData($shiftMap);

            return response()->json($formattedData);

        } catch (\Throwable $e) {
            Log::error('Audit Controller Error: ' . $e->getMessage());
            return response()->json(['error' => 'Data aggregation failed', 'details' => $e->getMessage()], 500);
        }
    }

    /**
     * Processes shifts, calculating sales, item costs, and waste costs.
     */
    private function processShifts($shifts): array
    {
        $shiftMap = [];

        foreach ($shifts as $shift) {
            $orderSales = $shift->orders
                ->where('status', 'paid')
                ->sum(fn($o) => (float) $o->total_amount);
            $tableSales = $shift->tables
                ->where('status', 'closed')
                ->sum(fn($t) => (float) $t->total_amount);

            $shiftItems = $shift->orders->pluck('items')->flatten()
                ->concat($shift->tables->pluck('items')->flatten());

            $shiftMap[$shift->id] = [
                'shift_id' => $shift->id,
                'date' => $shift->created_at->format('Y-m-d'),
                'opened_at' => optional($shift->opened_at)->toDateTimeString(),
                'closed_at' => optional($shift->closed_at)->toDateTimeString(),
                'sales' => $orderSales + $tableSales,
                'itemCost' => $shiftItems->sum(fn($i) => $this->calculateItemCost($i)),
                'wasteCost' => $shift->wasteLogs->sum(fn($w) => $this->calculateItemCost($w)),
                'variance_items' => [],
                'staff_names' => array_values(array_unique(
                    $shift->staff->pluck('name')->toArray()
                )),
            ];
        }

        return $shiftMap;
    }

    /**
     * Distributes variances to specific shifts based on timing.
     */
    private function processVariances($variances, array &$shiftMap): void
    {
        // Sort shifts by closed_at to determine the "next" shift correctly
        $sortedShifts = $shiftMap;
        uasort($sortedShifts, fn($a, $b) => strtotime($a['closed_at']) <=> strtotime($b['closed_at']));
        $shiftIds = array_keys($sortedShifts);

        foreach ($variances as $v) {
            if (!$v->product)
                continue;

            $shiftId = $this->matchShiftForVariance($v, $shiftMap, $shiftIds);

            if ($shiftId === null) {
                Log::warning("Variance unmatched: ID {$v->id} at {$v->created_at}");
                continue;
            }

            $pid = $v->product_id;
            $unitCost = $v->product->costDetails->unit_cost ?? ($v->product->cost_price ?? 0);

            if (!isset($shiftMap[$shiftId]['variance_items'][$pid])) {
                $shiftMap[$shiftId]['variance_items'][$pid] = [
                    'product_id' => $pid,
                    'product_name' => $v->product->name,
                    'quantity' => 0,
                    'unit_cost' => (float) $unitCost,
                ];
            }

            $shiftMap[$shiftId]['variance_items'][$pid]['quantity'] += (float) $v->variance;
        }
    }

    /**
     * Logic: 
     * 1. If inside shift: Match.
     * 2. If after shift close: Match if before next shift close.
     * 3. If last shift: Match all variances after close.
     */
    private function matchShiftForVariance($variance, array $shiftMap, array $shiftIds): ?string
    {
        if (!$variance->created_at)
            return null;
        $vTs = $variance->created_at->timestamp;

        Log::debug("Matching Variance ID {$variance->id}: Created at " . $variance->created_at);

        foreach ($shiftIds as $index => $shiftId) {
            $shift = $shiftMap[$shiftId];
            $opened = strtotime($shift['opened_at']);
            $closed = strtotime($shift['closed_at']);

            Log::debug("Checking Shift {$shiftId}: Opened {$shift['opened_at']}, Closed {$shift['closed_at']}");

            // 1. During the shift
            if ($vTs >= $opened && $vTs <= $closed) {
                Log::debug("MATCH: Found during shift window.");
                return $shiftId;
            }

            // 2. Gap logic (After shift closes)
            if ($vTs > $closed) {
                $nextShiftId = $shiftIds[$index + 1] ?? null;

                // Last shift case: assign everything after its close to the last shift
                if (!$nextShiftId) {
                    Log::debug("MATCH: Last shift, assigning variance.");
                    return $shiftId;
                }

                // Intermediate gap case
                $nextShiftClosed = strtotime($shiftMap[$nextShiftId]['closed_at']);
                Log::debug("Variance after shift close, checking next shift close: " . $shiftMap[$nextShiftId]['closed_at']);

                if ($vTs <= $nextShiftClosed) {
                    Log::debug("MATCH: Variance falls before next shift closes.");
                    return $shiftId;
                }
            }
        }

        Log::debug("NO MATCH: Variance fell through all checks.");
        return null;
    }

    /**
     * Final formatting and COGS calculation.
     */
    private function formatAuditData(array $shiftMap): array
    {
        $rows = array_map(function ($d) {
            $totalCostsBefore = $d['itemCost'] + $d['wasteCost'];

            // Calculate cost impact
            $varianceItems = array_values($d['variance_items']);
            foreach ($varianceItems as &$item) {
                // Negative quantity → missing (positive cost impact)
                // Positive quantity → extra (negative cost impact)
                $item['cost_impact'] = $item['quantity'] * $item['unit_cost'] * -1;
            }
            unset($item);

            $totalVariance = array_sum(array_column($varianceItems, 'cost_impact'));
            $totalCostsAfter = $totalCostsBefore + $totalVariance;

            usort($varianceItems, fn($a, $b) => abs($b['cost_impact']) <=> abs($a['cost_impact']));

            return [
                'shift_id' => $d['shift_id'],
                'date' => $d['date'],
                'opened_at' => $d['opened_at'],
                'closed_at' => $d['closed_at'],
                'sales' => $d['sales'],
                'itemCost' => $d['itemCost'],
                'wasteCost' => $d['wasteCost'],
                'variance' => $totalVariance,
                'staff_names' => $d['staff_names'],
                'variance_items' => $varianceItems,
                'cogsPctBefore' => $d['sales'] > 0 ? ($totalCostsBefore / $d['sales']) * 100 : 0,
                'cogsPctAfter' => $d['sales'] > 0 ? ($totalCostsAfter / $d['sales']) * 100 : 0,
            ];
        }, $shiftMap);

        // Order chronologically
        usort($rows, fn($a, $b) => strcmp($a['opened_at'] ?? '', $b['opened_at'] ?? ''));

        return array_values($rows);
    }

    /**
     * Calculates costs considering different order metadata types.
     */
    private function calculateItemCost($item)
    {
        $type = $item->metadata ?? 'unit';
        $product = $item->product;

        if (!$product)
            return 0;

        // Bottle logic
        if ($type === 'bottle') {
            return $product->cost_price;
        }

        // Standard unit or double logic
        $costModel = $product->costDetails;
        $unitCost = $costModel ? $costModel->unit_cost : 0;

        return ($type === 'double') ? ($unitCost * 2) : $unitCost;
    }
}