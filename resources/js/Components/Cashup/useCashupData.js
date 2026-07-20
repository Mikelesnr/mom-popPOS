import { useState, useEffect, useMemo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { HISTORY_PAGE_SIZE, formatShiftDate, groupItems } from "./helpers";

// All stateful logic for the Cashup screen lives here, so CashupContainer.jsx
// stays focused on layout/composition rather than fetch/print/reconciliation logic.
export function useCashupData(propShiftId) {
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
        if (!printTarget || !data) return "receipt";
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
        if (printTarget.type === "waste") {
            return `Waste Log - ${data.shop_name} - ${date}`;
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

    // ---- Derived values ----
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
    // not something fixable client-side.
    const productNameLookup = useMemo(() => {
        if (!data) return {};
        const map = {};

        // 1. Existing check: Orders and Tables
        [...(data.shift.orders || []), ...(data.shift.tables || [])].forEach(
            (t) => {
                (t.items || []).forEach((item) => {
                    if (item.product_id) map[item.product_id] = item.name;
                });
            },
        );

        // 2. Add this: Check Staff X-Slip transactions as a backup source
        Object.values(data.summary.totals_by_staff || {}).forEach((s) => {
            s.transactions.forEach((t) => {
                (t.items || []).forEach((item) => {
                    if (item.product_id && !map[item.product_id])
                        map[item.product_id] = item.name;
                });
            });
        });

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

    return {
        // shift selection / navigation
        shiftId,
        setShiftId,
        activeTab,
        setActiveTab,

        // current shift
        data,
        loading,
        loadError,
        isOpen,

        // history
        history,
        historyLoading,
        historyPage,
        setHistoryPage,
        totalHistoryPages,

        // blind reconciliation / close shift
        counts,
        setCounts,
        isClosing,
        closeError,
        handleCloseShift,

        // print
        printTarget,
        setPrintTarget,
        printRef,

        // derived values
        shopTotal,
        totalExpenses,
        voidedTablesList,
        productNameLookup,
        groupedShopItems,
        staffItemsByUser,
    };
}
