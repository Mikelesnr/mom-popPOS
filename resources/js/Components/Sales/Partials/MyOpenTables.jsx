import React, { useEffect, useState } from "react";
import { db } from "@/Utils/db";
import { X, AlertTriangle, Clock3, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import CustomDropdown from "@/Components/Shared/CustomDropdown"; // Corrected import

export default function MyOpenTables({ auth, isOpen, onClose, onSelect }) {
    const [tables, setTables] = useState([]);
    const [deferralTarget, setDeferralTarget] = useState("");
    const [isDeferring, setIsDeferring] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setDeferralTarget("");
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

    const handleDeferTable = async () => {
        if (!deferralTarget) return;

        const selectedTable = tables.find((t) => t.id === deferralTarget);

        if (
            !window.confirm(
                `Are you sure you want to defer ${selectedTable?.name}?`,
            )
        )
            return;

        setIsDeferring(true);
        try {
            await db.open_tables.update(deferralTarget, {
                status: "deferred",
                updated_at: new Date().toISOString(),
            });
            toast.success(`${selectedTable?.name} deferred successfully.`);
            setDeferralTarget("");
            loadTables();
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
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Clock3 className="text-indigo-600" />
                            My Open Tables ({tables.length})
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Please defer all unpaid tables before performing
                            cash-up.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-6">
                    {/* Deferral Section using CustomDropdown */}
                    {tables.length > 0 && (
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg space-y-3">
                            <h4 className="font-semibold text-amber-900 flex items-center gap-2">
                                <AlertTriangle size={18} />
                                Defer Unpaid Tables
                            </h4>
                            <div className="flex flex-col sm:flex-row gap-3 items-center pt-2">
                                <div className="flex-grow w-full">
                                    <CustomDropdown
                                        options={tables.map((t) => ({
                                            value: t.id,
                                            label: `${t.name} - $${parseFloat(t.total_amount || 0).toFixed(2)}`,
                                        }))}
                                        value={deferralTarget}
                                        onChange={setDeferralTarget}
                                        placeholder="-- Select table to defer --"
                                    />
                                </div>

                                <button
                                    onClick={handleDeferTable}
                                    disabled={!deferralTarget || isDeferring}
                                    className="w-full sm:w-auto px-5 py-4 bg-amber-600 text-white rounded-xl font-bold text-base hover:bg-amber-700 transition-colors disabled:bg-gray-300 flex items-center justify-center gap-2"
                                >
                                    {isDeferring ? (
                                        <Loader2
                                            size={18}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <AlertTriangle size={18} />
                                    )}
                                    Defer
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Table Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto p-1">
                        {tables.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    if (!isDeferring) {
                                        onSelect(t);
                                        onClose();
                                    }
                                }}
                                className="p-4 border rounded-xl text-left bg-white border-gray-200 hover:border-indigo-500 transition-all"
                            >
                                <div className="font-bold text-lg text-gray-800">
                                    {t.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                    Total: $
                                    {parseFloat(t.total_amount || 0).toFixed(2)}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
