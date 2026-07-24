<?php

namespace App\Http\Controllers\Audit;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use App\Models\StockVariance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AuditController extends Controller
{
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

            $dailyMap = [];

            $blankDay = fn($date) => [
                'date' => $date,
                'sales' => 0,
                'itemCost' => 0,
                'wasteCost' => 0,
                'variance' => 0,
                'staff_names' => [],
                'variance_items' => [], // keyed by product_id while building, flattened at the end
            ];

            // 2. Process Shifts and Aggregate Staff
            foreach ($shifts as $shift) {
                $date = $shift->created_at->format('Y-m-d');

                if (!isset($dailyMap[$date])) {
                    $dailyMap[$date] = $blankDay($date);
                }

                $shiftStaff = $shift->staff->pluck('name')->toArray();

                $dailyMap[$date]['staff_names'] = array_unique(
                    array_merge($dailyMap[$date]['staff_names'], $shiftStaff)
                );

                $dailyMap[$date]['sales'] += (float) $shift->blind_cash_reported;

                $shiftItems = $shift->orders->pluck('items')->flatten()->concat($shift->tables->pluck('items')->flatten());
                $dailyMap[$date]['itemCost'] += $shiftItems->sum(fn($i) => $this->calculateItemCost($i));
                $dailyMap[$date]['wasteCost'] += $shift->wasteLogs->sum(fn($w) => $this->calculateItemCost($w));
            }

            // 3. Process Variances - itemized, grouped by product per day
            foreach ($variances as $v) {
                $date = $v->created_at->format('Y-m-d');
                if (!isset($dailyMap[$date])) {
                    $dailyMap[$date] = $blankDay($date);
                }

                $costImpact = $this->calculateItemCost($v);
                $dailyMap[$date]['variance'] += $costImpact;

                if ($v->product) {
                    $pid = $v->product_id;

                    if (!isset($dailyMap[$date]['variance_items'][$pid])) {
                        $unitCost = $v->product->costDetails->unit_cost ?? ($v->product->cost_price ?? 0);

                        $dailyMap[$date]['variance_items'][$pid] = [
                            'product_id' => $pid,
                            'product_name' => $v->product->name,
                            'quantity' => 0,
                            'unit_cost' => (float) $unitCost,
                            'cost_impact' => 0,
                        ];
                    }

                    $dailyMap[$date]['variance_items'][$pid]['quantity'] += (float) $v->variance;
                    $dailyMap[$date]['variance_items'][$pid]['cost_impact'] += $costImpact;
                }
            }

            ksort($dailyMap);

            // 4. Final Format
            $formattedData = array_map(function ($d) {
                $totalCostsBefore = $d['itemCost'] + $d['wasteCost'];
                $totalCostsAfter = $totalCostsBefore + $d['variance'];

                // Flatten the per-product map into a list, worst offenders first
                $varianceItems = array_values($d['variance_items']);
                usort($varianceItems, fn($a, $b) => abs($b['cost_impact']) <=> abs($a['cost_impact']));

                return [
                    'date' => $d['date'],
                    'sales' => $d['sales'],
                    'variance' => $d['variance'],
                    'staff_names' => array_values($d['staff_names']),
                    'variance_items' => $varianceItems,
                    'cogsPctBefore' => $d['sales'] > 0 ? ($totalCostsBefore / $d['sales']) * 100 : 0,
                    'cogsPctAfter' => $d['sales'] > 0 ? ($totalCostsAfter / $d['sales']) * 100 : 0,
                ];
            }, $dailyMap);

            return response()->json(array_values($formattedData));

        } catch (\Throwable $e) {
            Log::error('Audit Controller Error: ' . $e->getMessage());
            return response()->json(['error' => 'Data aggregation failed'], 500);
        }
    }

    private function calculateItemCost($item)
    {
        $type = $item->metadata ?? 'unit';
        $product = $item->product;

        if (!$product)
            return 0;

        if ($type === 'bottle')
            return $product->cost_price;

        $costModel = $product->costDetails;
        $unitCost = $costModel ? $costModel->unit_cost : 0;

        return ($type === 'double') ? ($unitCost * 2) : $unitCost;
    }
}