import React, { useEffect, useState } from "react";
import { db } from "@/Utils/db";
import { X, Clock3 } from "lucide-react";
import toast from "react-hot-toast";

export default function MyOpenTables({ auth, isOpen, onClose, onSelect }) {
    const [tables, setTables] = useState([]);

    useEffect(() => {
        if (!isOpen) return;
        loadTables();
    }, [auth.user.id, isOpen]);

    const loadTables = async () => {
        try {
            const openTables = await db.open_tables
                .where("user_id")
                .equals(auth.user.id)
                .and((t) => t.status === "open")
                .toArray();
            setTables(openTables);
        } catch (error) {
            console.error("Failed to load tables", error);
            toast.error("Could not load open tables.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Clock3 className="text-indigo-600" />
                        My Tables ({tables.length})
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-400 hover:bg-gray-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Table Grid (Uniformity with Manager's Tables Page) */}
                <div className="p-5 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto content-start">
                    {tables.map((t, index) => (
                        <button
                            key={t.id}
                            onClick={() => {
                                onSelect(t);
                                onClose();
                            }}
                            className={`h-24 p-3 rounded-2xl text-left shadow-sm border-2 transition-all flex flex-col justify-center ${
                                index % 2 === 0
                                    ? "bg-stone-50 border-stone-200 hover:bg-stone-100"
                                    : "bg-emerald-50 border-emerald-100 hover:bg-emerald-100"
                            }`}
                        >
                            <span className="font-bold text-gray-900">
                                {t.name}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">
                                Total: $
                                {parseFloat(t.total_amount || 0).toFixed(2)}
                            </span>
                        </button>
                    ))}

                    {tables.length === 0 && (
                        <p className="col-span-2 text-center py-10 text-gray-400">
                            No open tables found.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
