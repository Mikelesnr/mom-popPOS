import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
    ComposedChart,
    Cell,
} from "recharts";
import {
    CalendarRange,
    TrendingUp,
    DollarSign,
    AlertTriangle,
    Users,
    PackageSearch,
    Loader2,
    Lock,
    X,
} from "lucide-react";
import { getCachedPaidStatus, refreshPaidStatus } from "./LicenseStatus";

// Brand palette
const COLORS = {
    forest: "#1F6F4A",
    red: "#D8392A",
    gold: "#D4A017",
    cream: "#FDF8F0",
    slate: "#94a3b8",
};

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

// Each row from the API is one closed shift (not one calendar day) — two
// shifts on the same date (e.g. morning + afternoon) come back as two
// separate rows. This builds a compact, human-readable label for each one
// so the charts and tooltips can tell them apart at a glance.
function shiftLabel(row) {
    if (!row.opened_at) return row.date;
    const opened = new Date(row.opened_at);
    const day = opened.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
    });
    const time = opened.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });
    return `${day}, ${time}`;
}

function shiftTimeRange(row) {
    if (!row.opened_at) return "";
    const opened = new Date(row.opened_at);
    const closed = row.closed_at ? new Date(row.closed_at) : null;
    const fmt = (d) =>
        d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return closed ? `${fmt(opened)} – ${fmt(closed)}` : fmt(opened);
}

export default function AuditComponent({ shopId }) {
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    const [dateRange, setDateRange] = useState({
        startDate: lastWeek.toISOString().split("T")[0],
        endDate: today.toISOString().split("T")[0],
    });

    const [loading, setLoading] = useState(false);
    const [auditData, setAuditData] = useState([]);
    const [selectedShiftId, setSelectedShiftId] = useState(null);
    const [isPaid, setIsPaid] = useState(getCachedPaidStatus());

    // Refresh the cached flag whenever this page is opened, so a device that's
    // been logged in for weeks doesn't run on a stale value.
    useEffect(() => {
        if (!shopId) return;
        refreshPaidStatus(shopId).then((data) => {
            if (data) setIsPaid(data.paid_status);
        });
    }, [shopId]);

    useEffect(() => {
        if (shopId && isPaid) fetchAuditData();
    }, [shopId, dateRange, isPaid]);

    if (!isPaid) {
        return (
            <div
                className="p-8 rounded-xl shadow-sm border border-stone-200 text-center space-y-3"
                style={{ backgroundColor: COLORS.cream }}
            >
                <div className="flex justify-center">
                    <div
                        className="p-3 rounded-full"
                        style={{ backgroundColor: "#fdecea" }}
                    >
                        <Lock size={22} style={{ color: COLORS.red }} />
                    </div>
                </div>
                <h2 className="text-lg font-bold text-stone-800">
                    Metrics Unavailable
                </h2>
                <p className="text-sm text-stone-600 max-w-md mx-auto">
                    Your subscription for this feature isn't active. Cashup
                    still works as normal — just close out each shift and count
                    it manually until this is sorted.
                </p>
                <p className="text-xs text-stone-500">
                    Contact us on WhatsApp{" "}
                    <a
                        href="https://wa.me/263773270659"
                        className="font-semibold underline"
                        style={{ color: COLORS.forest }}
                    >
                        +263 77 327 0659
                    </a>{" "}
                    to renew.
                </p>
            </div>
        );
    }

    const fetchAuditData = async () => {
        setLoading(true);
        try {
            const response = await axios.get("/audit/data", {
                params: { shopId, ...dateRange },
            });
            console.log(response.data);
            setAuditData(response.data);
            setSelectedShiftId(null);
        } catch (error) {
            console.error("Audit Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Chart-ready data — same rows as auditData, with a display label added
    // for the X axis and tooltips.
    const chartData = useMemo(
        () =>
            auditData.map((d) => ({
                ...d,
                label: shiftLabel(d),
            })),
        [auditData],
    );

    // ---- Period totals (always visible, regardless of selection) ----
    const totals = useMemo(() => {
        const totalSales = auditData.reduce((a, d) => a + d.sales, 0);
        const totalVariance = auditData.reduce((a, d) => a + d.variance, 0);
        const avgCogsAfter =
            auditData.length > 0
                ? auditData.reduce((a, d) => a + d.cogsPctAfter, 0) /
                  auditData.length
                : 0;
        return { totalSales, totalVariance, avgCogsAfter };
    }, [auditData]);

    // ---- The single shift currently selected via a chart click ----
    const selectedShift = useMemo(
        () => auditData.find((d) => d.shift_id === selectedShiftId) || null,
        [auditData, selectedShiftId],
    );

    const handleBarClick = (data) => {
        // When clicking the Bar, 'data' is the object representing the clicked item
        if (data && data.shift_id) {
            setSelectedShiftId(data.shift_id);
        }
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length > 0) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-stone-200 shadow-lg text-xs rounded-lg w-64">
                    <p className="font-bold border-b border-stone-100 pb-1 mb-2 text-stone-800">
                        {data.label}
                    </p>
                    <p className="mb-2 text-stone-500 italic">
                        Staff:{" "}
                        {data.staff_names && data.staff_names.length > 0
                            ? data.staff_names.join(", ")
                            : "None"}
                    </p>
                    <p className="flex justify-between">
                        <span>Sales</span>
                        <span className="font-semibold">
                            {money(data.sales)}
                        </span>
                    </p>
                    <p
                        className="flex justify-between"
                        style={{
                            color:
                                data.variance < 0 ? COLORS.red : COLORS.forest,
                        }}
                    >
                        <span>Variance</span>
                        <span className="font-semibold">
                            {money(data.variance)}
                        </span>
                    </p>
                </div>
            );
        }
        return null;
    };

    const TooltipCostOfSales = ({ active, payload }) => {
        if (active && payload && payload.length > 0) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-stone-200 shadow-lg text-xs rounded-lg w-64">
                    <p className="font-bold border-b border-stone-100 pb-1 mb-2 text-stone-800">
                        {data.label}
                    </p>
                    <p className="mb-2 text-stone-500 italic">
                        Staff:{" "}
                        {data.staff_names && data.staff_names.length > 0
                            ? data.staff_names.join(", ")
                            : "None"}
                    </p>
                    <p className="flex justify-between">
                        <span>COGS % Before</span>
                        <span className="font-semibold">
                            {data.cogsPctBefore.toFixed(2)}%
                        </span>
                    </p>
                    <p className="flex justify-between">
                        <span>COGS % After</span>
                        <span className="font-semibold text-red-600">
                            {data.cogsPctAfter.toFixed(2)}%
                        </span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div
            className="p-6 rounded-xl shadow-sm border border-stone-200 space-y-6"
            style={{ backgroundColor: COLORS.cream }}
        >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                        <PackageSearch
                            size={20}
                            style={{ color: COLORS.forest }}
                        />
                        Audit Dashboard
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                        Sales, cost of goods, and stock variance — one bar per
                        shift
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-3 py-2">
                    <CalendarRange size={16} className="text-stone-400" />
                    <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) =>
                            setDateRange({
                                ...dateRange,
                                startDate: e.target.value,
                            })
                        }
                        className="text-sm outline-none bg-transparent"
                    />
                    <span className="text-stone-300">→</span>
                    <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) =>
                            setDateRange({
                                ...dateRange,
                                endDate: e.target.value,
                            })
                        }
                        className="text-sm outline-none bg-transparent"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-sm text-stone-500 py-12 justify-center">
                    <Loader2 size={16} className="animate-spin" />
                    Loading audit data...
                </div>
            ) : auditData.length === 0 ? (
                <div className="text-sm text-stone-500 py-12 text-center">
                    No closed shifts for this date range.
                </div>
            ) : (
                <>
                    {/* ---- PERIOD TOTALS (always shown, across every shift in range) ---- */}
                    <div>
                        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">
                            Period Totals — {dateRange.startDate} to{" "}
                            {dateRange.endDate}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg border border-stone-200 p-4 flex items-center gap-3">
                                <div
                                    className="p-2 rounded-md"
                                    style={{ backgroundColor: "#eef7f1" }}
                                >
                                    <DollarSign
                                        size={18}
                                        style={{ color: COLORS.forest }}
                                    />
                                </div>
                                <div>
                                    <p className="text-xs text-stone-500">
                                        Total Sales
                                    </p>
                                    <p className="text-lg font-bold text-stone-800">
                                        {money(totals.totalSales)}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg border border-stone-200 p-4 flex items-center gap-3">
                                <div
                                    className="p-2 rounded-md"
                                    style={{
                                        backgroundColor:
                                            totals.totalVariance < 0
                                                ? "#fdecea"
                                                : "#eef7f1",
                                    }}
                                >
                                    <AlertTriangle
                                        size={18}
                                        style={{
                                            color:
                                                totals.totalVariance < 0
                                                    ? COLORS.red
                                                    : COLORS.forest,
                                        }}
                                    />
                                </div>
                                <div>
                                    <p className="text-xs text-stone-500">
                                        Total Variance
                                    </p>
                                    <p
                                        className="text-lg font-bold"
                                        style={{
                                            color:
                                                totals.totalVariance < 0
                                                    ? COLORS.red
                                                    : COLORS.forest,
                                        }}
                                    >
                                        {money(totals.totalVariance)}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg border border-stone-200 p-4 flex items-center gap-3">
                                <div
                                    className="p-2 rounded-md"
                                    style={{ backgroundColor: "#fdf6e3" }}
                                >
                                    <TrendingUp
                                        size={18}
                                        style={{ color: COLORS.gold }}
                                    />
                                </div>
                                <div>
                                    <p className="text-xs text-stone-500">
                                        Avg Cost of Sales % (After)
                                    </p>
                                    <p className="text-lg font-bold text-stone-800">
                                        {totals.avgCogsAfter.toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ---- SELECTED SHIFT TOTALS (appears once a bar is clicked) ---- */}
                    {selectedShift && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide">
                                    Selected Shift — {shiftLabel(selectedShift)}{" "}
                                    ({shiftTimeRange(selectedShift)})
                                </h3>
                                <button
                                    onClick={() => setSelectedShiftId(null)}
                                    className="text-xs text-stone-400 hover:text-stone-700 flex items-center gap-1"
                                >
                                    <X size={12} />
                                    Clear
                                </button>
                            </div>
                            <div
                                className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg p-4"
                                style={{
                                    backgroundColor: "#fdf6e3",
                                    border: `1px solid ${COLORS.gold}`,
                                }}
                            >
                                <div>
                                    <p className="text-xs text-stone-500">
                                        Shift Sales
                                    </p>
                                    <p className="text-lg font-bold text-stone-800">
                                        {money(selectedShift.sales)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-stone-500">
                                        Shift Net Variance
                                    </p>
                                    <p
                                        className="text-lg font-bold"
                                        style={{
                                            color:
                                                selectedShift.variance < 0
                                                    ? COLORS.red
                                                    : COLORS.forest,
                                        }}
                                    >
                                        {money(selectedShift.variance)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-stone-500">
                                        Shift Cost of Sales % (After)
                                    </p>
                                    <p className="text-lg font-bold text-stone-800">
                                        {selectedShift.cogsPctAfter.toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 1. COGS Chart */}
                    <div className="h-64 bg-white border border-stone-200 p-4 rounded-lg">
                        <h3 className="text-sm font-bold mb-2 text-stone-700">
                            Cost of Sales % by Shift
                        </h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={chartData}
                                onClick={handleBarClick}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#f0ebe1"
                                />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis unit="%" tick={{ fontSize: 11 }} />
                                <Tooltip content={<TooltipCostOfSales />} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar
                                    dataKey="cogsPctBefore"
                                    name="COGS % (Before)"
                                    fill={COLORS.slate}
                                    radius={[3, 3, 0, 0]}
                                    cursor="pointer"
                                    onClick={handleBarClick}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="cogsPctAfter"
                                    name="COGS % (After)"
                                    stroke={COLORS.red}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    {/* 2. Total Sales Chart */}
                    <div className="h-64 bg-white border border-stone-200 p-4 rounded-lg">
                        <h3 className="text-sm font-bold mb-2 text-stone-700">
                            Sales by Shift ($)
                        </h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} onClick={handleBarClick}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#f0ebe1"
                                />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey="sales"
                                    name="Sales"
                                    fill={COLORS.forest}
                                    radius={[3, 3, 0, 0]}
                                    cursor="pointer"
                                    onClick={handleBarClick}
                                >
                                    {chartData.map((d, i) => (
                                        <Cell
                                            key={i}
                                            fillOpacity={
                                                selectedShiftId === d.shift_id
                                                    ? 1
                                                    : 0.85
                                            }
                                            stroke={
                                                selectedShiftId === d.shift_id
                                                    ? COLORS.gold
                                                    : "none"
                                            }
                                            strokeWidth={2}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* 3. Variance Chart */}
                    <div className="h-64 bg-white border border-stone-200 p-4 rounded-lg">
                        <h3 className="text-sm font-bold mb-2 text-stone-700">
                            Variance by Shift ($)
                        </h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} onClick={handleBarClick}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#f0ebe1"
                                />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey="variance"
                                    name="Variance"
                                    radius={[3, 3, 0, 0]}
                                    cursor="pointer"
                                    onClick={handleBarClick}
                                >
                                    {chartData.map((d, i) => (
                                        <Cell
                                            key={i}
                                            fill={
                                                d.variance < 0
                                                    ? COLORS.red
                                                    : COLORS.forest
                                            }
                                            fillOpacity={
                                                selectedShiftId === d.shift_id
                                                    ? 1
                                                    : 0.85
                                            }
                                            stroke={
                                                selectedShiftId === d.shift_id
                                                    ? COLORS.gold
                                                    : "none"
                                            }
                                            strokeWidth={2}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Drill-down: staff + itemized variances for the selected shift */}
                    {selectedShift && (
                        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                            <div
                                className="px-4 py-3 flex items-center justify-between flex-wrap gap-2"
                                style={{ backgroundColor: "#fdf6e3" }}
                            >
                                <h3 className="font-bold text-stone-800">
                                    Breakdown for {shiftLabel(selectedShift)}
                                </h3>
                                <div className="flex gap-4 text-sm">
                                    <span className="text-stone-600">
                                        Sales:{" "}
                                        <strong>
                                            {money(selectedShift.sales)}
                                        </strong>
                                    </span>
                                    <span
                                        style={{
                                            color:
                                                selectedShift.variance < 0
                                                    ? COLORS.red
                                                    : COLORS.forest,
                                        }}
                                    >
                                        Variance:{" "}
                                        <strong>
                                            {money(selectedShift.variance)}
                                        </strong>
                                    </span>
                                    <span className="text-stone-600">
                                        COGS % After:{" "}
                                        <strong>
                                            {selectedShift.cogsPctAfter.toFixed(
                                                1,
                                            )}
                                            %
                                        </strong>
                                    </span>
                                </div>
                            </div>

                            {/* Staff on duty */}
                            <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2 flex-wrap">
                                <Users size={14} className="text-stone-400" />
                                <span className="text-xs text-stone-500 mr-1">
                                    Staff on duty:
                                </span>
                                {selectedShift.staff_names.length > 0 ? (
                                    selectedShift.staff_names.map((name) => (
                                        <span
                                            key={name}
                                            className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full"
                                        >
                                            {name}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-stone-400 italic">
                                        None recorded
                                    </span>
                                )}
                            </div>

                            {/* Itemized variances */}
                            <div className="p-4">
                                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">
                                    Stock Variances — What's Missing / Excess
                                </h4>

                                {selectedShift.variance_items.length === 0 ? (
                                    <p className="text-sm text-stone-400 italic py-4 text-center">
                                        No stock variances recorded for this
                                        shift.
                                    </p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-stone-500 border-b border-stone-200">
                                                <th className="py-2 pr-2 font-medium">
                                                    Product
                                                </th>
                                                <th className="py-2 px-2 font-medium text-right">
                                                    Qty Variance
                                                </th>
                                                <th className="py-2 px-2 font-medium text-right">
                                                    Unit Cost
                                                </th>
                                                <th className="py-2 pl-2 font-medium text-right">
                                                    Cost Impact
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedShift.variance_items.map(
                                                (item) => {
                                                    const isShortage =
                                                        item.quantity < 0;
                                                    return (
                                                        <tr
                                                            key={
                                                                item.product_id
                                                            }
                                                            className="border-b border-stone-100 last:border-0"
                                                        >
                                                            <td className="py-2 pr-2 font-medium text-stone-800">
                                                                {
                                                                    item.product_name
                                                                }
                                                            </td>
                                                            <td
                                                                className="py-2 px-2 text-right font-semibold"
                                                                style={{
                                                                    color: isShortage
                                                                        ? COLORS.red
                                                                        : COLORS.forest,
                                                                }}
                                                            >
                                                                {isShortage
                                                                    ? "−"
                                                                    : "+"}
                                                                {Math.abs(
                                                                    item.quantity,
                                                                ).toFixed(2)}
                                                            </td>
                                                            <td className="py-2 px-2 text-right text-stone-600">
                                                                {money(
                                                                    item.unit_cost,
                                                                )}
                                                            </td>
                                                            <td
                                                                className="py-2 pl-2 text-right font-semibold"
                                                                style={{
                                                                    color: isShortage
                                                                        ? COLORS.red
                                                                        : COLORS.forest,
                                                                }}
                                                            >
                                                                {money(
                                                                    item.unit_cost *
                                                                        -1 *
                                                                        item.quantity,
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                },
                                            )}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td
                                                    colSpan={3}
                                                    className="py-2 pr-2 text-right text-xs text-stone-500 font-medium"
                                                >
                                                    Total
                                                </td>
                                                <td
                                                    className="py-2 pl-2 text-right font-bold"
                                                    style={{
                                                        color:
                                                            selectedShift.variance <
                                                            0
                                                                ? COLORS.red
                                                                : COLORS.forest,
                                                    }}
                                                >
                                                    {money(
                                                        selectedShift.variance,
                                                    )}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
