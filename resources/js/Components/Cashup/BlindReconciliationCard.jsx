import React from "react";
import { BLIND_FIELDS, formatShiftDate, money } from "./helpers";

export function BlindReconciliationCard({
    data,
    isOpen,
    counts,
    setCounts,
    closeError,
    isClosing,
    onCloseShift,
}) {
    return (
        <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
            <h2 className="font-bold text-stone-900 mb-1">
                Blind Cashup Reconciliation
            </h2>
            <p className="text-xs text-stone-500 mb-4">
                Count the till and wallets first — system totals stay hidden
                until you submit.
            </p>

            {isOpen ? (
                <>
                    <div className="space-y-3">
                        {BLIND_FIELDS.map(([field, label]) => (
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
                                    value={counts[field]}
                                    onChange={(e) =>
                                        setCounts({
                                            ...counts,
                                            [field]: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        ))}
                    </div>

                    {closeError && (
                        <p className="text-red-600 text-sm mt-3">
                            {closeError}
                        </p>
                    )}

                    <button
                        onClick={onCloseShift}
                        disabled={isClosing}
                        className="mt-5 w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold py-3 rounded-md transition-colors"
                    >
                        {isClosing ? "Processing…" : "Close Shift & Finalize"}
                    </button>
                </>
            ) : (
                <div className="space-y-2 text-sm font-mono">
                    {BLIND_FIELDS.map(([field, label]) => (
                        <div key={field} className="flex justify-between">
                            <span className="text-stone-500 font-sans">
                                {label}
                            </span>
                            <span className="font-semibold text-stone-900">
                                {money(data.shift[field])}
                            </span>
                        </div>
                    ))}
                    <p className="text-xs text-stone-500 font-sans pt-2">
                        Closed {formatShiftDate(data.shift.closed_at)}
                    </p>
                </div>
            )}
        </section>
    );
}
