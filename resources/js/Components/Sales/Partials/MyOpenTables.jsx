import React, { useEffect, useState } from "react";
import { db } from "@/Utils/db";
import { X, AlertTriangle, Clock3, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function MyOpenTables({ auth, isOpen, onClose, onSelect }) {
    const [tables, setTables] = useState([]);
    // State to track which table is selected for deferral via dropdown
    const [deferralTarget, setDeferralTarget] = useState("");
    const [isDeferring, setIsDeferring] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        // Reset state when modal opens
        setDeferralTarget("");
        loadTables();
    }, [auth.user.id, isOpen]);

    const loadTables = async () => {
        try {
            // Assuming 'open_tables' is your Dexie store name
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

    // Handler to update table status to deferred locally
    const handleDeferTable = async () => {
        if (!deferralTarget) return;

        const selectedTableName = tables.find(
            (t) => t.id === deferralTarget,
        )?.name;

        if (
            !window.confirm(
                `Are you sure you want to defer ${selectedTableName}? It will not be able to accept new items until reopened.`,
            )
        ) {
            return;
        }

        setIsDeferring(true);
        try {
            // Perform update in Dexie
            await db.open_tables.update(deferralTarget, {
                status: "deferred",
                updated_at: new Date().toISOString(),
                // Optionally, you might want to flag it as un-synced if applicable
                // synced_at: null
            });

            toast.success(`${selectedTableName} deferred successfully.`);
            setDeferralTarget(""); // Reset selection
            loadTables(); // Refresh list
        } catch (error) {
            console.error("Deferral error", error);
            toast.error("Failed to defer table.");
        } finally {
            setIsDeferring(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Clock3 className="text-indigo-600" />
                        My Open Tables ({tables.length})
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-6">
                    {/* --- DEFERRAL SECTION (New UI Addition) --- */}
                    {tables.length > 0 && (
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg space-y-3">
                            <div className="flex items-center gap-2 text-amber-900">
                                <AlertTriangle
                                    size={18}
                                    className="text-amber-600"
                                />
                                <h4 className="font-semibold">
                                    End of Shift Action
                                </h4>
                            </div>
                            <p className="text-sm text-amber-800">
                                Select a table below to mark it as **Deferred**.
                                Deferred tables cannot accept new orders until
                                the next shift opens them.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 items-center pt-2">
                                <select
                                    value={deferralTarget}
                                    onChange={(e) =>
                                        setDeferralTarget(e.target.value)
                                    }
                                    className="flex-grow w-full p-2.5 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 text-sm"
                                >
                                    <option value="">
                                        -- Select table to defer --
                                    </option>
                                    {tables.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} - $
                                            {parseFloat(
                                                t.total_amount || 0,
                                            ).toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleDeferTable}
                                    disabled={!deferralTarget || isDeferring}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 text-white rounded-lg font-semibold text-sm hover:bg-amber-700 transition-colors disabled:bg-gray-300 flex items-center justify-center gap-2"
                                >
                                    {isDeferring ? (
                                        <Loader2
                                            size={16}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <AlertTriangle size={16} />
                                    )}
                                    Defer Table
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Grid of Tables (Click to Open/Edit) */}
                    <h3 className="font-semibold text-gray-700 pt-2 border-t border-gray-100">
                        Open Tables (Click to edit)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto p-1">
                        {tables.length === 0 ? (
                            <p className="text-gray-500 col-span-full text-center py-10 italic">
                                No open tables assigned to you.
                            </p>
                        ) : (
                            tables.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        // Do not allow selecting if actively deferring
                                        if (!isDeferring) {
                                            onSelect(t);
                                            onClose();
                                        }
                                    }}
                                    // Visual change if selected for deferral
                                    className={`p-4 border rounded-xl text-left transition-all group relative ${
                                        deferralTarget === t.id
                                            ? "border-amber-500 bg-amber-50 shadow-inner ring-1 ring-amber-500"
                                            : "bg-white border-gray-200 hover:border-indigo-500 hover:shadow-md"
                                    }`}
                                >
                                    {/* Selection indicator dot */}
                                    {deferralTarget === t.id && (
                                        <div className="absolute top-3 right-3 w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                                    )}

                                    <div
                                        className={`font-bold text-lg ${deferralTarget === t.id ? "text-amber-900" : "text-gray-800 group-hover:text-indigo-600"}`}
                                    >
                                        {t.name}
                                    </div>
                                    <div
                                        className={`text-sm ${deferralTarget === t.id ? "text-amber-700" : "text-gray-500"}`}
                                    >
                                        Total: $
                                        {parseFloat(
                                            t.total_amount || 0,
                                        ).toFixed(2)}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-2 font-mono uppercase truncate">
                                        ID: {t.id}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Close footer for mobile if needed */}
                <div className="sm:hidden p-4 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="w-full p-3 bg-gray-200 rounded-xl font-semibold"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// Add these small animations to your global CSS or <style> tag in layout
const styles = `
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-up { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.animate-fade-in { animation: fade-in 0.2s ease-out; }
.animate-slide-up { animation: slide-up 0.3s ease-out; }
`;
