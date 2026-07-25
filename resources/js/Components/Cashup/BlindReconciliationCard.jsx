import React from "react";
import { money } from "./helpers";

export function BlindReconciliationCard({
    data,
    isOpen,
    isClosing,
    closeError,
    onCloseShift,
}) {
    // 1. Determine which totals to display:
    // If closed, use the saved ShiftPayment records.
    // If open, use the system-calculated summary.
    const displayTotals = isOpen
        ? Object.entries(data?.summary?.totals_by_method || {})
        : (data?.shift?.payments || []).map((p) => [
              p.payment_method.name,
              p.amount,
          ]);

    const grandTotal = isOpen
        ? Object.values(data?.summary?.totals_by_method || {}).reduce(
              (a, b) => a + Number(b),
              0,
          )
        : (data?.shift?.payments || []).reduce(
              (a, p) => a + Number(p.amount),
              0,
          );

    return (
        <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
            <h2 className="font-bold text-stone-900 mb-1">
                {isOpen ? "Shift Reconciliation" : "Finalized Reconciliation"}
            </h2>
            <p className="text-xs text-stone-500 mb-4">
                {isOpen
                    ? "Verify system totals to finalize."
                    : "Recorded payments for this shift."}
            </p>

            <div className="space-y-2 font-mono text-sm">
                {displayTotals.map(([method, amount], index) => (
                    <div
                        key={index}
                        className="flex justify-between border-b border-stone-100 py-1"
                    >
                        <span className="capitalize text-stone-600 font-sans">
                            {method}
                        </span>
                        <span className="font-semibold text-stone-900">
                            {money(amount)}
                        </span>
                    </div>
                ))}

                <div className="flex justify-between pt-3 border-t border-stone-200 font-bold">
                    <span className="text-stone-800">Total</span>
                    <span className="text-[#14352E]">{money(grandTotal)}</span>
                </div>
            </div>

            {isOpen && (
                <>
                    {closeError && (
                        <p className="text-red-600 text-sm mt-3">
                            {closeError}
                        </p>
                    )}
                    <button
                        onClick={onCloseShift}
                        disabled={isClosing}
                        className="mt-5 w-full bg-[#14352E] hover:bg-[#0f2921] disabled:opacity-60 text-white font-bold py-3 rounded-md transition-colors"
                    >
                        {isClosing ? "Processing…" : "Confirm & Close Shift"}
                    </button>
                </>
            )}
        </section>
    );
}
