import React from "react";
import { PAYMENT_METHODS, money } from "./helpers";

export function StaffXSlipsCard({
    totalsByStaff,
    deferredTables,
    onPrintStaff,
}) {
    const staffEntries = Object.entries(totalsByStaff);

    return (
        <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
            <h2 className="font-bold text-stone-900 mb-4">Staff X-Slips</h2>
            {staffEntries.length === 0 ? (
                <p className="text-sm text-stone-500">
                    No sales recorded on this shift yet.
                </p>
            ) : (
                <div className="space-y-3">
                    {staffEntries.map(([userId, s]) => {
                        const staffTotal = Object.values(s.methods).reduce(
                            (a, b) => a + Number(b),
                            0,
                        );
                        const staffTables = Object.values(
                            deferredTables,
                        ).filter((t) => t.staff_name === s.staff_name);

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
                                            (m) => Number(s.methods[m]) > 0,
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
                                    {staffTables.length > 0 && (
                                        <p className="text-xs text-amber-700 mt-1">
                                            {staffTables.length} unpaid table
                                            {staffTables.length > 1
                                                ? "s"
                                                : ""}{" "}
                                            ·{" "}
                                            {money(
                                                staffTables.reduce(
                                                    (a, t) =>
                                                        a +
                                                        Number(t.total_amount),
                                                    0,
                                                ),
                                            )}{" "}
                                            — itemized on print
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => onPrintStaff(userId)}
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
    );
}
