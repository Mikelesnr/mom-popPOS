import React from "react";
import { money } from "./helpers";

export function UnpaidTablesCard({ deferredTables, onPrintTable }) {
    const tables = Object.values(deferredTables);

    return (
        <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
            <h2 className="font-bold text-stone-900 mb-4">Unpaid Tables</h2>
            {tables.length === 0 ? (
                <p className="text-sm text-stone-500">
                    No unpaid tables on this shift.
                </p>
            ) : (
                <div className="space-y-3">
                    {tables.map((table) => (
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
                                        {money(table.total_amount)}
                                    </span>
                                </p>
                            </div>
                            <button
                                onClick={() => onPrintTable(table.id)}
                                className="shrink-0 text-[#14352E] font-medium underline underline-offset-2 text-sm"
                            >
                                Print Receipt
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
