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

            $dailyMap = $this->processShifts($shifts);
            $this->processVariances($variances, $dailyMap);

            ksort($dailyMap);

            $formattedData = $this->formatAuditData($dailyMap);

            return response()->json(array_values($formattedData));

        } catch (\Throwable $e) {
            Log::error('Audit Controller Error: ' . $e->getMessage());
            return response()->json(['error' => 'Data aggregation failed'], 500);
        }
    }

    private function getBlankDay(string $date): array
    {
        return [
            'date' => $date,
            'sales' => 0,
            'itemCost' => 0,
            'wasteCost' => 0,
            'variance_items' => [],
            'staff_names' => [],
        ];
    }

    private function processShifts($shifts): array
    {
        $dailyMap = [];

        foreach ($shifts as $shift) {
            $date = $shift->created_at->format('Y-m-d');

            if (!isset($dailyMap[$date])) {
                $dailyMap[$date] = $this->getBlankDay($date);
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

        return $dailyMap;
    }

    private function processVariances($variances, &$dailyMap): void
    {
        foreach ($variances as $v) {
            $date = $v->created_at->format('Y-m-d');
            if (!isset($dailyMap[$date])) {
                $dailyMap[$date] = $this->getBlankDay($date);
            }

            if ($v->product) {
                $pid = $v->product_id;
                $unitCost = $v->product->costDetails->unit_cost ?? ($v->product->cost_price ?? 0);

                if (!isset($dailyMap[$date]['variance_items'][$pid])) {
                    $dailyMap[$date]['variance_items'][$pid] = [
                        'product_id' => $pid,
                        'product_name' => $v->product->name,
                        'quantity' => 0,
                        'unit_cost' => (float) $unitCost,
                    ];
                }

                $dailyMap[$date]['variance_items'][$pid]['quantity'] += (float) $v->variance;
            }
        }
    }

    private function formatAuditData(array $dailyMap): array
    {
        return array_map(function ($d) {
            $totalCostsBefore = $d['itemCost'] + $d['wasteCost'];

            // ✅ Calculate cost impact with sign rule
            $varianceItems = array_values($d['variance_items']);
            foreach ($varianceItems as &$item) {
                // Negative quantity → missing → positive cost impact
                // Positive quantity → extra → negative cost impact
                $item['cost_impact'] = $item['quantity'] * $item['unit_cost'] * -1;
            }

            $totalVariance = array_sum(array_column($varianceItems, 'cost_impact'));
            $totalCostsAfter = $totalCostsBefore + $totalVariance;

            usort($varianceItems, fn($a, $b) => abs($b['cost_impact']) <=> abs($a['cost_impact']));

            return [
                'date' => $d['date'],
                'sales' => $d['sales'],
                'wasteCost' => $d['wasteCost'],
                'variance' => $totalVariance,
                'staff_names' => array_values($d['staff_names']),
                'variance_items' => $varianceItems,
                'cogsPctBefore' => $d['sales'] > 0 ? ($totalCostsBefore / $d['sales']) * 100 : 0,
                'cogsPctAfter' => $d['sales'] > 0 ? ($totalCostsAfter / $d['sales']) * 100 : 0,
            ];
        }, $dailyMap);
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
