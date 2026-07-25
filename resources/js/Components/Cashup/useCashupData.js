import { useState, useEffect, useMemo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { HISTORY_PAGE_SIZE, formatShiftDate, groupItems } from "./helpers";
import { getCsrfToken } from "@/Utils/db";

export function useCashupData(propShiftId) {
    const [shiftId, setShiftId] = useState(
        () => propShiftId || localStorage.getItem("terminal_shift_id"),
    );

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    const [activeTab, setActiveTab] = useState("current");
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);

    const [isClosing, setIsClosing] = useState(false);
    const [closeError, setCloseError] = useState(null);

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
                localStorage.setItem("cashup_shift_id", id);
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

    useEffect(() => {
        if (!printTarget) return;
        const timer = setTimeout(() => printReceipt(), 50);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [printTarget]);

    // ---- Close shift using system-calculated totals ----
    const handleCloseShift = async () => {
        if (!data?.summary?.totals_by_method) return;

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
                // Send the exact system totals map
                body: JSON.stringify({
                    totals: data.summary.totals_by_method,
                }),
            });
            if (response.ok) {
                await loadShift(shiftId);
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

    const groupedShopItems = useMemo(
        () =>
            groupItems(
                data
                    ? Object.values(data.summary.totals_by_staff).flatMap((s) =>
                          s.transactions.flatMap((t) => t.items),
                      )
                    : [],
            ),
        [data],
    );

    const staffItemsByUser = useMemo(() => {
        if (!data) return {};
        const result = {};
        Object.entries(data.summary.totals_by_staff).forEach(([userId, s]) => {
            result[userId] = groupItems(s.transactions.flatMap((t) => t.items));
        });
        return result;
    }, [data]);

    const closeTable = async (tableId, paymentData) => {
        const currentShiftId = localStorage.getItem("terminal_shift_id");

        if (!currentShiftId) {
            console.error("No active shift ID found in localStorage.");
            return;
        }

        try {
            const response = await fetch(`/cashup/table/${tableId}/close`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
                body: JSON.stringify({
                    method: paymentData.method,
                    current_shift_id: currentShiftId,
                }),
            });

            if (response.ok) {
                loadShift(shiftId);
            } else {
                console.error("Failed to close table server-side");
            }
        } catch (e) {
            console.error("Failed to close table:", e);
        }
    };

    return {
        shiftId,
        setShiftId,
        activeTab,
        closeTable,
        setActiveTab,
        data,
        loading,
        loadError,
        isOpen: data ? !data.shift.closed_at : false,
        history,
        historyLoading,
        historyPage,
        setHistoryPage,
        totalHistoryPages: Math.max(
            1,
            Math.ceil(history.length / HISTORY_PAGE_SIZE),
        ),
        isClosing,
        closeError,
        handleCloseShift,
        printTarget,
        setPrintTarget,
        printRef,
        shopTotal,
        totalExpenses,
        voidedTablesList,
        groupedShopItems,
        staffItemsByUser,
    };
}
