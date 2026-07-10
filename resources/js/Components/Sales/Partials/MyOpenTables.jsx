import React, { useEffect, useState } from "react";
import { db } from "@/Utils/db";
import { X } from "lucide-react";

export default function MyOpenTables({ auth, isOpen, onClose, onSelect }) {
    const [tables, setTables] = useState([]);

    useEffect(() => {
        if (!isOpen) return;
        const loadTables = async () => {
            // Ensure you are querying the correct store name as defined in db.js
            // If you renamed 'tables' to 'open_tables' in db.js, ensure this matches
            const openTables = await db.open_tables
                .where("user_id")
                .equals(auth.user.id)
                .and((t) => t.status === "open")
                .toArray();
            setTables(openTables);
        };
        loadTables();
    }, [auth.user.id, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">
                        My Open Tables
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Grid of Tables */}
                <div className="p-4 grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                    {tables.length === 0 ? (
                        <p className="text-gray-500 col-span-2 text-center py-10">
                            No open tables found.
                        </p>
                    ) : (
                        tables.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    onSelect(t);
                                    onClose();
                                }}
                                className="p-4 bg-white border border-gray-200 rounded-xl text-left hover:border-indigo-500 hover:shadow-md transition-all group"
                            >
                                <div className="font-bold text-lg text-gray-800 group-hover:text-indigo-600">
                                    {t.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                    Total: $
                                    {parseFloat(t.total_amount || 0).toFixed(2)}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-2 font-mono uppercase">
                                    ID: {t.id.substring(0, 8)}...
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
