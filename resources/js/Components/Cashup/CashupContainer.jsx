import React, { useState, useEffect, useMemo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { ReceiptTemplate } from "../Shared/ReceiptTemplate";
import { Head } from "@inertiajs/react";

// Canonical payment method list + display order, used everywhere totals are broken down.
const PAYMENT_METHODS = [
    "cash",
    "card",
    "ecocash",
    "onemoney",
    "inbucks",
    "omari",
];

const BLIND_FIELDS = [
    ["blind_cash_reported", "Cash"],
    ["blind_ecocash_reported", "EcoCash"],
    ["blind_swipe_reported", "Swipe"],
    ["blind_onemoney_reported", "OneMoney"],
];

const HISTORY_PAGE_SIZE = 8;

function formatShiftDate(dateString) {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function money(value) {
    const n = Number(value || 0);
    return `$${n.toFixed(2)}`;
}

// Payload quantities come through as fixed 3-decimal strings ("2.000").
// Show whole numbers cleanly, trim to at most 2dp otherwise.
function qty(value) {
    const n = Number(value || 0);
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

// Collapses a flat list of order/table line items into one row per
// product+serving-size, summing quantity and subtotal. Used so X-slips
// and the shop-wide Z-slip show "3 x Castle Lager" instead of three
// separate lines from three separate orders.
function groupItems(items) {
    const map = new Map();
    for (const item of items) {
        const key = `${item.product_id}__${item.metadata}`;
        const q = Number(item.quantity || 0);
        const sub = Number(item.subtotal || 0);
        if (map.has(key)) {
            const existing = map.get(key);
            existing.quantity += q;
            existing.subtotal += sub;
        } else {
            map.set(key, {
                id: key,
                name: item.name,
                metadata: item.metadata,
                unit_price: Number(item.unit_price || 0),
                quantity: q,
                subtotal: sub,
            });
        }
    }
    return Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
    );
}

export default function Cashup({ shiftId: propShiftId }) {
    const [shiftId, setShiftId] = useState(
        () => propShiftId || localStorage.getItem("terminal_shift_id"),
    );

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    const [activeTab, setActiveTab] = useState("current"); // 'current' | 'history'

    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);

    const [counts, setCounts] = useState({
        blind_cash_reported: "",
        blind_ecocash_reported: "",
        blind_swipe_reported: "",
        blind_onemoney_reported: "",
    });
    const [isClosing, setIsClosing] = useState(false);
    const [closeError, setCloseError] = useState(null);

    // Which receipt renders into the isolated print node.
    // { type: 'shop' } | { type: 'staff', id } | { type: 'table', id }
    const [printTarget, setPrintTarget] = useState(null);
    const printRef = useRef(null);

    const printDocumentTitle = () => {
        if (!printTarget) return "receipt";
        const date = formatShiftDate(data.shift.created_at);

        if (printTarget.type === "shop") {
            return `${data.shop_name} Cashup ${date}`;
        }
        if (printTarget.type === "staff") {
            const staffName =
                data.summary.totals_by_staff[printTarget.id]?.staff_name ||
                "Staff";
            return `${staffName} Cashup ${date}`;
        }
        if (printTarget.type === "table") {
            const table = Object.values(data.summary.deferred_tables).find(
                (t) => t.id === printTarget.id,
            );
            return `Bill for ${table?.name || "Table"} ${date}`;
        }
        return "receipt";
    };

    const printReceipt = useReactToPrint({
        contentRef: printRef,
        documentTitle: printDocumentTitle,
        onAfterPrint: () => setPrintTarget(null),
    });

    // ---- Load a shift's cashup summary ----
    const loadShift = (id) => {
        if (!id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setLoadError(null);
        fetch(`/cashup/${id}`)
            .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
            .then((res) => {
                setData(res);
                setLoading(false);
                localStorage.setItem("terminal_shift_id", id);
            })
            .catch((err) => {
                console.error("Failed to load shift data:", err);
                setLoadError("Could not load this shift.");
                setLoading(false);
            });
    };

    useEffect(() => {
        loadShift(shiftId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shiftId]);

    // ---- Load shift history (lazy — only when the History tab is opened) ----
    const loadHistory = () => {
        setHistoryLoading(true);
        fetch(`/cashup/history/all`)
            .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
            .then((res) => {
                setHistory(Array.isArray(res) ? res : []);
                setHistoryLoaded(true);
                setHistoryLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load shift history:", err);
                setHistoryLoading(false);
            });
    };

    useEffect(() => {
        if (activeTab === "history" && !historyLoaded) {
            loadHistory();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // ---- Print — wait a tick for the targeted receipt to render into printRef, then print ----
    useEffect(() => {
        if (!printTarget) return;
        const timer = setTimeout(() => printReceipt(), 50);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [printTarget]);

    // ---- Close shift ----
    const handleCloseShift = async () => {
        setIsClosing(true);
        setCloseError(null);
        try {
            const response = await fetch(`/cashup/${shiftId}/close`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": document.querySelector(
                        'meta[name="csrf-token"]',
                    )?.content,
                },
                body: JSON.stringify({
                    blind_cash_reported: Number(
                        counts.blind_cash_reported || 0,
                    ),
                    blind_ecocash_reported: Number(
                        counts.blind_ecocash_reported || 0,
                    ),
                    blind_swipe_reported: Number(
                        counts.blind_swipe_reported || 0,
                    ),
                    blind_onemoney_reported: Number(
                        counts.blind_onemoney_reported || 0,
                    ),
                }),
            });
            if (response.ok) {
                await loadShift(shiftId); // refresh in place, no full reload
            } else {
                const err = await response.json().catch(() => null);
                setCloseError(err?.message || "Failed to close shift.");
            }
        } catch (e) {
            console.error(e);
            setCloseError("Network error while closing the shift.");
        }
        setIsClosing(false);
    };

    const shopWideItems = useMemo(() => {
        if (!data) return [];
        return Object.values(data.summary.totals_by_staff).flatMap((s) =>
            s.transactions.flatMap((t) => t.items),
        );
    }, [data]);

    const shopTotal = useMemo(() => {
        if (!data) return 0;
        return Object.values(data.summary.totals_by_method).reduce(
            (a, b) => a + Number(b),
            0,
        );
    }, [data]);

    const totalExpenses = useMemo(() => {
        if (!data) return 0;
        return (data.shift.expenses || []).reduce(
            (a, e) => a + Number(e.amount || 0),
            0,
        );
    }, [data]);

    const voidedTablesList = useMemo(() => {
        if (!data) return [];
        return Object.values(data.summary.voided_tables || {});
    }, [data]);

    // waste_logs only carries product_id, not a name — build a lookup from
    // the line items that WERE sold this shift (which do carry names) so we
    // can label waste entries. Anything wasted that was never sold this
    // shift won't resolve; that's a genuine data gap on the backend side,
    // not something we can fix client-side.
    const productNameLookup = useMemo(() => {
        if (!data) return {};
        const map = {};
        [...(data.shift.orders || []), ...(data.shift.tables || [])].forEach(
            (t) => {
                (t.items || []).forEach((item) => {
                    if (!map[item.product_id]) map[item.product_id] = item.name;
                });
            },
        );
        return map;
    }, [data]);

    const groupedShopItems = useMemo(
        () => groupItems(shopWideItems),
        [shopWideItems],
    );

    const staffItemsByUser = useMemo(() => {
        if (!data) return {};
        const result = {};
        Object.entries(data.summary.totals_by_staff).forEach(([userId, s]) => {
            result[userId] = groupItems(s.transactions.flatMap((t) => t.items));
        });
        return result;
    }, [data]);

    const isOpen = data ? !data.shift.closed_at : false;
    const totalHistoryPages = Math.max(
        1,
        Math.ceil(history.length / HISTORY_PAGE_SIZE),
    );

    return (
        <div className="min-h-screen bg-stone-50">
            <Head title={data ? `Cashup - ${data.shop_name}` : "Cashup"} />

            {/* ============ SCREEN UI (hidden entirely when printing) ============ */}
            <div className="print:hidden">
                {/* Header */}
                <header className="bg-[#14352E] text-stone-50 px-6 py-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-emerald-300/80 mb-1">
                            Cashup
                        </p>
                        <h1 className="text-2xl font-bold">
                            {data ? data.shop_name : "No Active Shift"}
                        </h1>
                        <p className="text-sm text-stone-300 mt-1">
                            {data
                                ? formatShiftDate(data.shift.created_at)
                                : "Select a shift from history, or open a new one from the dashboard"}
                        </p>
                    </div>
                    {data && (
                        <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                isOpen
                                    ? "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40"
                                    : "bg-stone-500/20 text-stone-300 ring-1 ring-stone-400/30"
                            }`}
                        >
                            {isOpen ? "Shift Open" : "Shift Closed"}
                        </span>
                    )}
                </header>

                {/* Tabs */}
                <div className="px-6 pt-5">
                    <div className="inline-flex rounded-lg border border-stone-200 bg-white p-1">
                        <button
                            onClick={() => setActiveTab("current")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeTab === "current"
                                    ? "bg-[#14352E] text-white"
                                    : "text-stone-600 hover:text-stone-900"
                            }`}
                        >
                            Current Shift
                        </button>
                        <button
                            onClick={() => setActiveTab("history")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeTab === "history"
                                    ? "bg-[#14352E] text-white"
                                    : "text-stone-600 hover:text-stone-900"
                            }`}
                        >
                            Shift History
                        </button>
                    </div>
                </div>

                {/* ---- Current Shift ---- */}
                {activeTab === "current" && loading && (
                    <div className="p-10 text-center text-stone-500">
                        Loading cashup session…
                    </div>
                )}

                {activeTab === "current" && !loading && loadError && (
                    <div className="p-10 text-center text-red-600">
                        {loadError}
                    </div>
                )}

                {activeTab === "current" && !loading && !loadError && !data && (
                    <div className="p-10 text-center">
                        <p className="text-stone-500 mb-4">
                            No shift is currently open for this shop.
                        </p>
                        <button
                            onClick={() => setActiveTab("history")}
                            className="px-4 py-2 rounded-md bg-[#14352E] text-white text-sm font-medium"
                        >
                            View Shift History
                        </button>
                    </div>
                )}

                {activeTab === "current" && !loading && !loadError && data && (
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* LEFT column: shop totals + reconciliation */}
                        <div className="lg:col-span-1 space-y-6">
                            <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
                                <h2 className="font-bold text-stone-900 mb-3">
                                    Shop Totals by Payment Method
                                </h2>
                                <div className="space-y-2 font-mono text-sm">
                                    {PAYMENT_METHODS.map((method) => (
                                        <div
                                            key={method}
                                            className="flex justify-between"
                                        >
                                            <span className="capitalize text-stone-500 font-sans">
                                                {method}
                                            </span>
                                            <span className="font-semibold text-stone-900">
                                                {money(
                                                    data.summary
                                                        .totals_by_method[
                                                        method
                                                    ],
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-stone-200 mt-3 pt-3 flex justify-between font-bold text-stone-900">
                                    <span>Total</span>
                                    <span className="font-mono">
                                        {money(shopTotal)}
                                    </span>
                                </div>
                                <button
                                    onClick={() =>
                                        setPrintTarget({ type: "shop" })
                                    }
                                    className="mt-4 w-full bg-[#14352E] hover:bg-[#0f2921] text-white text-sm font-semibold py-2.5 rounded-md transition-colors"
                                >
                                    Print Shop X-Slip
                                </button>
                            </section>

                            <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
                                <h2 className="font-bold text-stone-900 mb-1">
                                    Blind Cashup Reconciliation
                                </h2>
                                <p className="text-xs text-stone-500 mb-4">
                                    Count the till and wallets first — system
                                    totals stay hidden until you submit.
                                </p>

                                {isOpen ? (
                                    <>
                                        <div className="space-y-3">
                                            {BLIND_FIELDS.map(
                                                ([field, label]) => (
                                                    <div key={field}>
                                                        <label className="block text-sm font-medium text-stone-700 mb-1">
                                                            {label}
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            inputMode="decimal"
                                                            placeholder="0.00"
                                                            className="w-full border border-stone-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#14352E]/40 focus:border-[#14352E]"
                                                            value={
                                                                counts[field]
                                                            }
                                                            onChange={(e) =>
                                                                setCounts({
                                                                    ...counts,
                                                                    [field]:
                                                                        e.target
                                                                            .value,
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                ),
                                            )}
                                        </div>

                                        {closeError && (
                                            <p className="text-red-600 text-sm mt-3">
                                                {closeError}
                                            </p>
                                        )}

                                        <button
                                            onClick={handleCloseShift}
                                            disabled={isClosing}
                                            className="mt-5 w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold py-3 rounded-md transition-colors"
                                        >
                                            {isClosing
                                                ? "Processing…"
                                                : "Close Shift & Finalize"}
                                        </button>
                                    </>
                                ) : (
                                    <div className="space-y-2 text-sm font-mono">
                                        {BLIND_FIELDS.map(([field, label]) => (
                                            <div
                                                key={field}
                                                className="flex justify-between"
                                            >
                                                <span className="text-stone-500 font-sans">
                                                    {label}
                                                </span>
                                                <span className="font-semibold text-stone-900">
                                                    {money(data.shift[field])}
                                                </span>
                                            </div>
                                        ))}
                                        <p className="text-xs text-stone-500 font-sans pt-2">
                                            Closed{" "}
                                            {formatShiftDate(
                                                data.shift.closed_at,
                                            )}
                                        </p>
                                    </div>
                                )}
                            </section>

                            <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
                                <h2 className="font-bold text-stone-900 mb-3">
                                    Expenses
                                </h2>
                                {!data.shift.expenses ||
                                data.shift.expenses.length === 0 ? (
                                    <p className="text-sm text-stone-500">
                                        No expenses logged this shift.
                                    </p>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            {data.shift.expenses.map(
                                                (expense) => (
                                                    <div
                                                        key={expense.id}
                                                        className="flex justify-between items-start gap-3 text-sm border-b border-stone-100 pb-2 last:border-0 last:pb-0"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-stone-900">
                                                                {expense.name}
                                                            </p>
                                                            <p className="text-xs text-stone-500 capitalize">
                                                                {expense.type}
                                                                {expense.notes
                                                                    ? ` · ${expense.notes}`
                                                                    : ""}
                                                            </p>
                                                        </div>
                                                        <span className="font-mono font-semibold text-stone-900 shrink-0">
                                                            {money(
                                                                expense.amount,
                                                            )}
                                                        </span>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                        <div className="border-t border-stone-200 mt-3 pt-3 flex justify-between font-bold text-stone-900 text-sm">
                                            <span>Total Expenses</span>
                                            <span className="font-mono">
                                                {money(totalExpenses)}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </section>

                            <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
                                <h2 className="font-bold text-stone-900 mb-3">
                                    Waste &amp; Breakages
                                </h2>
                                {!data.shift.waste_logs ||
                                data.shift.waste_logs.length === 0 ? (
                                    <p className="text-sm text-stone-500">
                                        No waste logged this shift.
                                    </p>
                                ) : (
                                    <div className="space-y-2 text-sm">
                                        {data.shift.waste_logs.map((log) => {
                                            const productName =
                                                productNameLookup[
                                                    log.product_id
                                                ];
                                            return (
                                                <div
                                                    key={log.id}
                                                    className="flex justify-between gap-3 border-b border-stone-100 pb-2 last:border-0 last:pb-0"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-stone-800 font-medium">
                                                            {qty(log.quantity)}{" "}
                                                            ×{" "}
                                                            {productName || (
                                                                <span className="text-stone-400 italic">
                                                                    Unknown item
                                                                </span>
                                                            )}
                                                            {log.metadata &&
                                                            log.metadata !==
                                                                "unit"
                                                                ? ` (${log.metadata})`
                                                                : ""}
                                                        </p>
                                                        <p className="text-xs text-stone-500">
                                                            {log.reason}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* RIGHT column: staff X-slips + deferred tables */}
                        <div className="lg:col-span-2 space-y-6">
                            <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
                                <h2 className="font-bold text-stone-900 mb-4">
                                    Staff X-Slips
                                </h2>
                                {Object.keys(data.summary.totals_by_staff)
                                    .length === 0 ? (
                                    <p className="text-sm text-stone-500">
                                        No sales recorded on this shift yet.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {Object.entries(
                                            data.summary.totals_by_staff,
                                        ).map(([userId, s]) => {
                                            const staffTotal = Object.values(
                                                s.methods,
                                            ).reduce(
                                                (a, b) => a + Number(b),
                                                0,
                                            );
                                            return (
                                                <div
                                                    key={userId}
                                                    className="p-4 border border-stone-200 rounded-lg flex items-center justify-between gap-4"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-stone-900">
                                                            {s.staff_name}
                                                        </p>
                                                        <p className="text-xs text-stone-500 font-mono truncate">
                                                            {PAYMENT_METHODS.filter(
                                                                (m) =>
                                                                    Number(
                                                                        s
                                                                            .methods[
                                                                            m
                                                                        ],
                                                                    ) > 0,
                                                            )
                                                                .map(
                                                                    (m) =>
                                                                        `${m}: ${money(s.methods[m])}`,
                                                                )
                                                                .join("   ")}
                                                        </p>
                                                        <p className="text-sm font-bold text-stone-900 mt-1">
                                                            {money(staffTotal)}
                                                        </p>
                                                        {(() => {
                                                            const staffTables =
                                                                Object.values(
                                                                    data.summary
                                                                        .deferred_tables,
                                                                ).filter(
                                                                    (t) =>
                                                                        t.staff_name ===
                                                                        s.staff_name,
                                                                );
                                                            if (
                                                                staffTables.length ===
                                                                0
                                                            )
                                                                return null;
                                                            return (
                                                                <p className="text-xs text-amber-700 mt-1">
                                                                    {
                                                                        staffTables.length
                                                                    }{" "}
                                                                    unpaid table
                                                                    {staffTables.length >
                                                                    1
                                                                        ? "s"
                                                                        : ""}{" "}
                                                                    ·{" "}
                                                                    {money(
                                                                        staffTables.reduce(
                                                                            (
                                                                                a,
                                                                                t,
                                                                            ) =>
                                                                                a +
                                                                                Number(
                                                                                    t.total_amount,
                                                                                ),
                                                                            0,
                                                                        ),
                                                                    )}{" "}
                                                                    — itemized
                                                                    on print
                                                                </p>
                                                            );
                                                        })()}
                                                    </div>
                                                    <button
                                                        onClick={() =>
                                                            setPrintTarget({
                                                                type: "staff",
                                                                id: userId,
                                                            })
                                                        }
                                                        className="shrink-0 bg-stone-800 hover:bg-stone-900 text-white px-4 py-2 rounded-md text-sm transition-colors"
                                                    >
                                                        Print
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>

                            <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
                                <h2 className="font-bold text-stone-900 mb-4">
                                    Unpaid Tables
                                </h2>
                                {Object.values(data.summary.deferred_tables)
                                    .length === 0 ? (
                                    <p className="text-sm text-stone-500">
                                        No unpaid tables on this shift.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {Object.values(
                                            data.summary.deferred_tables,
                                        ).map((table) => (
                                            <div
                                                key={table.id}
                                                className="p-4 border border-stone-200 rounded-lg flex items-center justify-between gap-4"
                                            >
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-stone-900">
                                                        Table: {table.name}
                                                    </p>
                                                    <p className="text-xs text-stone-500">
                                                        {table.staff_name} ·{" "}
                                                        <span className="font-mono">
                                                            {money(
                                                                table.total_amount,
                                                            )}
                                                        </span>
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        setPrintTarget({
                                                            type: "table",
                                                            id: table.id,
                                                        })
                                                    }
                                                    className="shrink-0 text-[#14352E] font-medium underline underline-offset-2 text-sm"
                                                >
                                                    Print Receipt
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
                                <h2 className="font-bold text-stone-900 mb-4">
                                    Voided Tables
                                </h2>
                                {voidedTablesList.length === 0 ? (
                                    <p className="text-sm text-stone-500">
                                        No voided tables this shift.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {voidedTablesList.map((table) => (
                                            <div
                                                key={table.id}
                                                className="p-4 border border-red-100 bg-red-50/60 rounded-lg flex items-center justify-between gap-4"
                                            >
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-stone-900">
                                                        Table: {table.name}
                                                    </p>
                                                    <p className="text-xs text-stone-500">
                                                        {table.staff_name}
                                                        {" · "}
                                                        <span className="font-mono line-through">
                                                            {money(
                                                                table.total_amount,
                                                            )}
                                                        </span>
                                                    </p>
                                                </div>
                                                <span className="shrink-0 text-xs font-semibold text-red-600 uppercase tracking-wide">
                                                    Void
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                )}

                {/* ---- Shift History ---- */}
                {activeTab === "history" && (
                    <div className="p-6">
                        <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
                            <h2 className="font-bold text-stone-900 mb-4">
                                Shift History
                            </h2>

                            {historyLoading ? (
                                <p className="text-sm text-stone-500">
                                    Loading history…
                                </p>
                            ) : history.length === 0 ? (
                                <p className="text-sm text-stone-500">
                                    No closed shifts yet.
                                </p>
                            ) : (
                                <>
                                    <div className="divide-y divide-stone-100">
                                        {history
                                            .slice(
                                                (historyPage - 1) *
                                                    HISTORY_PAGE_SIZE,
                                                historyPage * HISTORY_PAGE_SIZE,
                                            )
                                            .map((s) => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => {
                                                        setShiftId(s.id);
                                                        setActiveTab("current");
                                                    }}
                                                    className="w-full text-left py-3 px-2 flex items-center justify-between hover:bg-stone-50 rounded-md transition-colors"
                                                >
                                                    <span className="text-sm text-stone-800">
                                                        {formatShiftDate(
                                                            s.created_at,
                                                        )}
                                                    </span>
                                                    <span className="text-xs text-stone-500">
                                                        Closed{" "}
                                                        {formatShiftDate(
                                                            s.closed_at,
                                                        )}
                                                    </span>
                                                </button>
                                            ))}
                                    </div>

                                    <div className="flex items-center justify-between mt-4 text-sm">
                                        <button
                                            onClick={() =>
                                                setHistoryPage((p) =>
                                                    Math.max(1, p - 1),
                                                )
                                            }
                                            disabled={historyPage === 1}
                                            className="px-3 py-1.5 border border-stone-300 rounded-md disabled:opacity-40"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-stone-500">
                                            Page {historyPage} of{" "}
                                            {totalHistoryPages}
                                        </span>
                                        <button
                                            onClick={() =>
                                                setHistoryPage((p) =>
                                                    p < totalHistoryPages
                                                        ? p + 1
                                                        : p,
                                                )
                                            }
                                            disabled={
                                                historyPage >= totalHistoryPages
                                            }
                                            className="px-3 py-1.5 border border-stone-300 rounded-md disabled:opacity-40"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </>
                            )}
                        </section>
                    </div>
                )}
            </div>

            {/* ============ ISOLATED PRINT NODE ============
                 react-to-print clones this node into its own hidden iframe and prints
                 only that — it doesn't matter what layout/nav wraps this page. Kept
                 off-screen (not display:none, which some browsers refuse to print)
                 rather than toggled with CSS print classes. */}
            <div className="fixed -left-[9999px] top-0">
                <div ref={printRef}>
                    {printTarget?.type === "shop" && (
                        <ReceiptTemplate
                            shopName={data.shop_name}
                            title={`${data.shop_name} Cashup`}
                            date={formatShiftDate(data.shift.created_at)}
                            staff="All Staff"
                            items={groupedShopItems}
                            totals={data.summary.totals_by_method}
                        />
                    )}

                    {printTarget?.type === "staff" &&
                        data.summary.totals_by_staff[printTarget.id] && (
                            <ReceiptTemplate
                                shopName={data.shop_name}
                                title={`${
                                    data.summary.totals_by_staff[printTarget.id]
                                        .staff_name
                                } Cashup`}
                                date={formatShiftDate(data.shift.created_at)}
                                staff={
                                    data.summary.totals_by_staff[printTarget.id]
                                        .staff_name
                                }
                                items={staffItemsByUser[printTarget.id] || []}
                                totals={
                                    data.summary.totals_by_staff[printTarget.id]
                                        .methods
                                }
                                deferredTables={Object.values(
                                    data.summary.deferred_tables,
                                ).filter(
                                    (t) =>
                                        t.staff_name ===
                                        data.summary.totals_by_staff[
                                            printTarget.id
                                        ].staff_name,
                                )}
                            />
                        )}

                    {printTarget?.type === "table" &&
                        Object.values(data.summary.deferred_tables)
                            .filter((t) => t.id === printTarget.id)
                            .map((table) => (
                                <ReceiptTemplate
                                    key={table.id}
                                    shopName={data.shop_name}
                                    title={`Bill for ${table.name}`}
                                    date={formatShiftDate(
                                        data.shift.created_at,
                                    )}
                                    staff={table.staff_name}
                                    items={table.items}
                                    totals={{ total: table.total_amount }}
                                />
                            ))}
                </div>
            </div>
        </div>
    );
}
