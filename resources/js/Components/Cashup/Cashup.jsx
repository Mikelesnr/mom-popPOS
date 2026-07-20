import React from "react";
import { Head } from "@inertiajs/react";
import { useCashupData } from "./useCashupData";
import { formatShiftDate } from "./helpers";
import { ShopTotalsCard } from "./ ShopTotalsCard";
import { BlindReconciliationCard } from "./BlindReconciliationCard";
import { ExpensesCard } from "./ExpensesCard";
import { WasteLogsCard } from "./WasteLogsCard";
import { StaffXSlipsCard } from "./StaffXSlipsCard";
import { UnpaidTablesCard } from "./UnpaidTablesCard";
import { VoidedTablesCard } from "./VoidedTablesCard";
import { ShiftHistoryCard } from "./ShiftHistoryCard";
import { CashupReceipts } from "./CashupReceipts";

export default function Cashup({ shiftId: propShiftId }) {
    const {
        setShiftId,
        activeTab,
        setActiveTab,
        data,
        loading,
        loadError,
        isOpen,
        history,
        historyLoading,
        historyPage,
        setHistoryPage,
        totalHistoryPages,
        counts,
        setCounts,
        isClosing,
        closeError,
        handleCloseShift,
        printTarget,
        setPrintTarget,
        printRef,
        shopTotal,
        totalExpenses,
        voidedTablesList,
        productNameLookup,
        groupedShopItems,
        staffItemsByUser,
    } = useCashupData(propShiftId);

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
                        {/* LEFT column: shop totals + reconciliation + expenses/waste */}
                        <div className="lg:col-span-1 space-y-6">
                            <ShopTotalsCard
                                data={data}
                                shopTotal={shopTotal}
                                onPrintShop={() =>
                                    setPrintTarget({ type: "shop" })
                                }
                            />

                            <BlindReconciliationCard
                                data={data}
                                isOpen={isOpen}
                                counts={counts}
                                setCounts={setCounts}
                                closeError={closeError}
                                isClosing={isClosing}
                                onCloseShift={handleCloseShift}
                            />

                            <ExpensesCard
                                expenses={data.shift.expenses}
                                totalExpenses={totalExpenses}
                            />

                            <WasteLogsCard
                                wasteLogs={data.shift.waste_logs}
                                onPrintWaste={() =>
                                    setPrintTarget({ type: "waste" })
                                }
                            />
                        </div>

                        {/* RIGHT column: staff X-slips + deferred/voided tables */}
                        <div className="lg:col-span-2 space-y-6">
                            <StaffXSlipsCard
                                totalsByStaff={data.summary.totals_by_staff}
                                deferredTables={data.summary.deferred_tables}
                                onPrintStaff={(userId) =>
                                    setPrintTarget({
                                        type: "staff",
                                        id: userId,
                                    })
                                }
                            />

                            <UnpaidTablesCard
                                deferredTables={data.summary.deferred_tables}
                                onPrintTable={(tableId) =>
                                    setPrintTarget({
                                        type: "table",
                                        id: tableId,
                                    })
                                }
                            />

                            <VoidedTablesCard
                                voidedTablesList={voidedTablesList}
                            />
                        </div>
                    </div>
                )}

                {/* ---- Shift History ---- */}
                {activeTab === "history" && (
                    <div className="p-6">
                        <ShiftHistoryCard
                            history={history}
                            historyLoading={historyLoading}
                            historyPage={historyPage}
                            setHistoryPage={setHistoryPage}
                            totalHistoryPages={totalHistoryPages}
                            onSelectShift={(id) => {
                                setShiftId(id);
                                setActiveTab("current");
                            }}
                        />
                    </div>
                )}
            </div>

            <CashupReceipts
                data={data}
                printTarget={printTarget}
                printRef={printRef}
                groupedShopItems={groupedShopItems}
                staffItemsByUser={staffItemsByUser}
            />
        </div>
    );
}
