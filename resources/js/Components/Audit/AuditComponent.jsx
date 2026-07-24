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
    const [selectedDate, setSelectedDate] = useState(null);
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
            setAuditData(response.data);
            setSelectedDate(null);
        } catch (error) {
            console.error("Audit Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

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

    const selectedDay = useMemo(
        () => auditData.find((d) => d.date === selectedDate) || null,
        [auditData, selectedDate],
    );

    const handleBarClick = (e) => {
        if (e && e.activeLabel) setSelectedDate(e.activeLabel);
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length > 0) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-stone-200 shadow-lg text-xs rounded-lg w-64">
                    <p className="font-bold border-b border-stone-100 pb-1 mb-2 text-stone-800">
                        {data.date}
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
                        Sales, cost of goods, and stock variance over time
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
                    No data for this date range.
                </div>
            ) : (
                <>
                    {/* KPI cards */}
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
                                    Net Variance
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
                                    Avg COGS % (After)
                                </p>
                                <p className="text-lg font-bold text-stone-800">
                                    {totals.avgCogsAfter.toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 1. COGS Chart */}
                    <div className="h-64 bg-white border border-stone-200 p-4 rounded-lg">
                        <h3 className="text-sm font-bold mb-2 text-stone-700">
                            Cost of Sales %
                        </h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={auditData}
                                onClick={handleBarClick}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#f0ebe1"
                                />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis unit="%" tick={{ fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar
                                    dataKey="cogsPctBefore"
                                    name="COGS % (Before)"
                                    fill={COLORS.slate}
                                    radius={[3, 3, 0, 0]}
                                    cursor="pointer"
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
                            Total Sales ($)
                        </h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={auditData} onClick={handleBarClick}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#f0ebe1"
                                />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey="sales"
                                    name="Sales"
                                    fill={COLORS.forest}
                                    radius={[3, 3, 0, 0]}
                                    cursor="pointer"
                                >
                                    {auditData.map((d, i) => (
                                        <Cell
                                            key={i}
                                            fillOpacity={
                                                selectedDate === d.date
                                                    ? 1
                                                    : 0.85
                                            }
                                            stroke={
                                                selectedDate === d.date
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
                            Daily Variance ($)
                        </h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={auditData} onClick={handleBarClick}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#f0ebe1"
                                />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey="variance"
                                    name="Variance"
                                    radius={[3, 3, 0, 0]}
                                    cursor="pointer"
                                >
                                    {auditData.map((d, i) => (
                                        <Cell
                                            key={i}
                                            fill={
                                                d.variance < 0
                                                    ? COLORS.red
                                                    : COLORS.forest
                                            }
                                            fillOpacity={
                                                selectedDate === d.date
                                                    ? 1
                                                    : 0.85
                                            }
                                            stroke={
                                                selectedDate === d.date
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

                    {/* Drill-down: staff + itemized variances for the selected day */}
                    {selectedDay && (
                        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                            <div
                                className="px-4 py-3 flex items-center justify-between"
                                style={{ backgroundColor: "#fdf6e3" }}
                            >
                                <h3 className="font-bold text-stone-800">
                                    Breakdown for {selectedDay.date}
                                </h3>
                                <div className="flex gap-4 text-sm">
                                    <span className="text-stone-600">
                                        Sales:{" "}
                                        <strong>
                                            {money(selectedDay.sales)}
                                        </strong>
                                    </span>
                                    <span
                                        style={{
                                            color:
                                                selectedDay.variance < 0
                                                    ? COLORS.red
                                                    : COLORS.forest,
                                        }}
                                    >
                                        Variance:{" "}
                                        <strong>
                                            {money(selectedDay.variance)}
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
                                {selectedDay.staff_names.length > 0 ? (
                                    selectedDay.staff_names.map((name) => (
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

                                {selectedDay.variance_items.length === 0 ? (
                                    <p className="text-sm text-stone-400 italic py-4 text-center">
                                        No stock variances recorded for this
                                        day.
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
                                            {selectedDay.variance_items.map(
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
                                                                    item.cost_impact,
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
                                                            selectedDay.variance <
                                                            0
                                                                ? COLORS.red
                                                                : COLORS.forest,
                                                    }}
                                                >
                                                    {money(
                                                        selectedDay.variance,
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
