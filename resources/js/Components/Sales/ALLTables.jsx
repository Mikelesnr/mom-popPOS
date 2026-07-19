import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/Utils/db";
import TableDetailModal from "./Partials/TableDetailModal";

export default function AllTables() {
    const [selectedTable, setSelectedTable] = useState(null);

    const tables = useLiveQuery(async () => {
        const openTables = await db.open_tables
            .where("status")
            .equals("open")
            .toArray();
        const users = await db.users.toArray();

        return openTables.map((t) => ({
            ...t,
            staffName: users.find((u) => u.id === t.user_id)?.name || "Unknown",
        }));
    });

    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-3 content-start">
                {tables?.map((table, index) => (
                    <button
                        key={table.id}
                        onClick={() => setSelectedTable(table)}
                        className={`h-24 p-2 rounded-2xl shadow-sm border-2 transition-all flex flex-col justify-center items-center text-center ${
                            index % 2 === 0
                                ? "bg-stone-50 border-stone-200 hover:bg-stone-100 active:bg-stone-200"
                                : "bg-emerald-50 border-emerald-100 hover:bg-emerald-100 active:bg-emerald-200"
                        }`}
                    >
                        <span className="font-bold text-base sm:text-lg leading-snug text-gray-900 break-words">
                            {table.name}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-600 mt-1 uppercase tracking-wider truncate max-w-full">
                            {table.staffName}
                        </span>
                    </button>
                ))}
            </div>

            {selectedTable && (
                <TableDetailModal
                    table={selectedTable}
                    onClose={() => setSelectedTable(null)}
                />
            )}
        </>
    );
}
