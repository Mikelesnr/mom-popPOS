import React from "react";
import { money } from "./helpers";

export function VoidedTablesCard({ voidedTablesList }) {
    return (
        <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
            <h2 className="font-bold text-stone-900 mb-4">Voided Tables</h2>
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
                                        {money(table.total_amount)}
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
    );
}
