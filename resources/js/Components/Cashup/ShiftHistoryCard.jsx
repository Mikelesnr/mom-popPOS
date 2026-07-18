import React from "react";
import { HISTORY_PAGE_SIZE, formatShiftDate } from "./helpers";

export function ShiftHistoryCard({
    history,
    historyLoading,
    historyPage,
    setHistoryPage,
    totalHistoryPages,
    onSelectShift,
}) {
    return (
        <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
            <h2 className="font-bold text-stone-900 mb-4">Shift History</h2>

            {historyLoading ? (
                <p className="text-sm text-stone-500">Loading history…</p>
            ) : history.length === 0 ? (
                <p className="text-sm text-stone-500">No closed shifts yet.</p>
            ) : (
                <>
                    <div className="divide-y divide-stone-100">
                        {history
                            .slice(
                                (historyPage - 1) * HISTORY_PAGE_SIZE,
                                historyPage * HISTORY_PAGE_SIZE,
                            )
                            .map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => onSelectShift(s.id)}
                                    className="w-full text-left py-3 px-2 flex items-center justify-between hover:bg-stone-50 rounded-md transition-colors"
                                >
                                    <span className="text-sm text-stone-800">
                                        {formatShiftDate(s.created_at)}
                                    </span>
                                    <span className="text-xs text-stone-500">
                                        Closed {formatShiftDate(s.closed_at)}
                                    </span>
                                </button>
                            ))}
                    </div>

                    <div className="flex items-center justify-between mt-4 text-sm">
                        <button
                            onClick={() =>
                                setHistoryPage((p) => Math.max(1, p - 1))
                            }
                            disabled={historyPage === 1}
                            className="px-3 py-1.5 border border-stone-300 rounded-md disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <span className="text-stone-500">
                            Page {historyPage} of {totalHistoryPages}
                        </span>
                        <button
                            onClick={() =>
                                setHistoryPage((p) =>
                                    p < totalHistoryPages ? p + 1 : p,
                                )
                            }
                            disabled={historyPage >= totalHistoryPages}
                            className="px-3 py-1.5 border border-stone-300 rounded-md disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </>
            )}
        </section>
    );
}
