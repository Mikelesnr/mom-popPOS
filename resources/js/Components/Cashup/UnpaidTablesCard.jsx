import React, { useState } from "react";
import { money } from "./helpers";
import PaymentSelectionModal from "../Sales/PaymentSelectionModal"; // Adjust path as needed

export function UnpaidTablesCard({
    deferredTables,
    onPrintTable,
    onCloseTable,
}) {
    const [activeTable, setActiveTable] = useState(null);
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
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onPrintTable(table.id)}
                                    className="text-stone-400 hover:text-stone-600 underline text-sm"
                                >
                                    Print
                                </button>
                                <button
                                    onClick={() => setActiveTable(table)}
                                    className="bg-[#14352E] text-white px-3 py-1 rounded text-sm font-semibold"
                                >
                                    Close Table
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTable && (
                <PaymentSelectionModal
                    totalAmount={parseFloat(activeTable.total_amount)}
                    onCancel={() => setActiveTable(null)}
                    onSelect={(paymentData) => {
                        onCloseTable(activeTable.id, paymentData);
                        setActiveTable(null);
                    }}
                />
            )}
        </section>
    );
}
