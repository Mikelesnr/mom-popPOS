import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Save, Edit2, XCircle, MinusCircle, Lock, Wine } from "lucide-react";

// Import utilities
import ShotCounter from "@/Utils/ShotCounter";
import { saveStockCountLocal, deleteStockCountLocal } from "@/Utils/db";

export default function EditableCountInput({
    item,
    onUpdate,
    shopShotSizeMl,
    isLocked,
}) {
    const [isEditing, setIsEditing] = useState(false);

    // 1. Determine product type
    const isBottle = ShotCounter.isBottleProduct(item.catalog_data);

    // 2. Local state during editing
    const [localShots, setLocalShots] = useState(item.ui_state.shots || "");
    const [localEachCount, setLocalEachCount] = useState(
        item.ui_state.each_count || "",
    );

    // Sync local edit state if external state changes
    useEffect(() => {
        if (!isEditing) {
            setLocalShots(item.ui_state.shots || "");
            setLocalEachCount(item.ui_state.each_count || "");
        }
    }, [item.ui_state, isEditing]);

    // Common Save Logic
    const performSave = async (finalValue, newUiState) => {
        if (isLocked) return;

        let calculatedTotalBaseUnits = 0;

        if (isBottle) {
            // --- A: SPIRIT MODE ---
            // We still need conversion here to get Total ML from Shots.
            calculatedTotalBaseUnits = ShotCounter.convertShotsToMl(
                finalValue,
                shopShotSizeMl,
            );
        } else {
            // --- B: SIMPLE UNIT MODE (FIXED) ---
            // OLD CODE DELETED: const unitsPerPack = parseFloat(item.catalog_data?.unit?.conversion_rate) || 0;
            // OLD CODE DELETED: calculatedTotalBaseUnits = parseFloat(finalValue) * unitsPerPack;

            // NEW FIXED CODE: Treat input as raw base units.
            // If user enters "12", we save "12".
            calculatedTotalBaseUnits = parseFloat(finalValue) || 0;
        }

        try {
            // Save to Dexie Ledger
            await saveStockCountLocal(item.id, calculatedTotalBaseUnits);

            // Update Parent State
            onUpdate(item.id, newUiState);
            setIsEditing(false);
        } catch (err) {
            console.error("Error saving count locally:", err);
            toast.error("Failed to save count.");
        }
    };

    // Handle Save (Direct Input)
    const handleSaveDirect = () => {
        if (isBottle) {
            // Visual estimates allowed (e.g., 15.5 shots)
            const finalShots = parseFloat(localShots) || 0;
            if (finalShots < 0) {
                toast.error("Shots cannot be negative");
                return;
            }
            performSave(finalShots, { shots: finalShots, each_count: null });
        } else {
            // --- UNIT MODE (FIXED) ---
            const count = parseFloat(localEachCount) || 0;
            if (count < 0) {
                toast.error("Count cannot be negative");
                return;
            }

            // Save the exact number entered by the user (e.g., 12 bottles)
            performSave(count, { each_count: count, shots: null });
        }
    };

    const handleUnlock = (e) => {
        e.stopPropagation();
        if (!isLocked) return;

        const toastId = toast(
            (t) => (
                <div className="flex flex-col gap-3">
                    <p className="font-medium text-gray-900">
                        Unlock <span className="font-bold">{item.name}</span>?
                    </p>
                    <div className="flex justify-end gap-2 mt-1">
                        <button
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-sm font-medium"
                            onClick={() => toast.dismiss(t.id)}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium"
                            onClick={async () => {
                                toast.dismiss(t.id);
                                try {
                                    await deleteStockCountLocal(item.id);
                                    onUpdate(item.id, {
                                        shots: null,
                                        each_count: null,
                                    });
                                    toast.success(`${item.name} unlocked`);
                                } catch (err) {
                                    toast.error("Failed to unlock item.");
                                }
                            }}
                        >
                            Yes, Unlock
                        </button>
                    </div>
                </div>
            ),
            { duration: 6000, position: "top-center" },
        );
    };

    const handleClear = (e) => {
        e.stopPropagation();
        if (isLocked) return;
        setLocalShots("");
        setLocalEachCount("");
    };

    // --- RENDER LOGIC ---

    // LOCKED STATE
    if (isLocked) {
        const displayValue = isBottle
            ? `${item.ui_state.shots ?? "0"} shots remaining`
            : `${item.ui_state.each_count ?? "0"} units`; // Clarified display

        return (
            <div className="w-full h-full px-3 py-2.5 text-right font-mono tabular-nums border-b border-gray-100 bg-amber-50 text-amber-900 flex items-center justify-end gap-1.5 rounded-md">
                <Lock size={14} className="text-amber-700 flex-shrink-0" />
                <span className="truncate text-sm">{displayValue}</span>
                <button
                    onClick={handleUnlock}
                    className="text-gray-400 hover:text-red-600 p-0.5 flex-shrink-0"
                    title="Unlock to edit"
                >
                    <XCircle size={16} />
                </button>
            </div>
        );
    }

    // DISPLAY MODE (Unlocked)
    if (!isEditing) {
        const hasBeenCounted = isBottle
            ? item.ui_state.shots !== null && item.ui_state.shots !== ""
            : item.ui_state.each_count !== null &&
              item.ui_state.each_count !== "";

        const displayValue = isBottle
            ? `${item.ui_state.shots ?? "0"} shots`
            : `${item.ui_state.each_count ?? "0"} units`;

        return (
            <div
                onClick={() => setIsEditing(true)}
                className={`group w-full h-full px-3 py-2.5 cursor-pointer text-right font-mono tabular-nums border-b border-gray-100 rounded-md transition-colors duration-150 ${hasBeenCounted ? "bg-blue-50 text-gray-900" : "bg-blue-50/50 text-gray-400"} hover:bg-blue-100 hover:text-gray-950`}
            >
                <div className="flex items-center justify-end gap-1.5">
                    <span className="truncate text-sm">{displayValue}</span>
                    {isBottle && (
                        <Wine
                            size={15}
                            className="text-gray-300 group-hover:text-blue-500 flex-shrink-0"
                        />
                    )}
                    {hasBeenCounted && (
                        <Edit2
                            size={14}
                            className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        />
                    )}
                </div>
            </div>
        );
    }

    // EDITING MODE
    return (
        <div className="absolute inset-0 z-20 bg-white p-1 shadow-xl border-2 border-blue-400 rounded-md flex items-center gap-1.5 animate-in fade-in">
            <button
                onClick={handleClear}
                className="text-gray-300 hover:text-red-500 p-1 flex-shrink-0"
                title="Clear input"
            >
                <MinusCircle size={18} />
            </button>

            {isBottle ? (
                // SPIRIT MODE (Visual estimate of remaining shots)
                <div className="flex w-full gap-1.5 items-center">
                    <div className="flex flex-col w-full gap-0.5">
                        <label className="text-[10px] text-amber-700 font-bold px-1">
                            EST. SHOTS LEFT
                        </label>
                        <input
                            type="number"
                            value={localShots}
                            onChange={(e) => setLocalShots(e.target.value)}
                            min="0"
                            step="0.5"
                            placeholder="0.0"
                            className="w-full text-sm p-1.5 border rounded border-amber-300 bg-amber-50 text-amber-900 focus:ring-1 focus:ring-amber-300 focus:border-amber-400 font-bold"
                            autoFocus
                        />
                    </div>
                    <button
                        onClick={handleSaveDirect}
                        className="bg-blue-600 text-white p-2.5 rounded-md h-full flex items-center self-end hover:bg-blue-700 flex-shrink-0 mt-3.5"
                        title="Save count"
                    >
                        <Save size={18} />
                    </button>
                </div>
            ) : (
                // --- MODIFIED: SIMPLE UNIT MODE ---
                <div className="flex w-full gap-1.5 items-center">
                    <div className="flex flex-col w-full gap-0.5">
                        <label className="text-[10px] text-gray-700 font-bold px-1">
                            QUANTITY (Total Count)
                        </label>
                        <input
                            type="number"
                            value={localEachCount}
                            onChange={(e) => setLocalEachCount(e.target.value)}
                            min="0"
                            step="1"
                            placeholder="0"
                            className="w-full text-sm p-1.5 border rounded border-gray-300 focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
                            autoFocus
                        />
                    </div>
                    <button
                        onClick={handleSaveDirect}
                        className="bg-blue-600 text-white p-2.5 rounded-md h-full flex items-center self-end hover:bg-blue-700 flex-shrink-0 mt-3.5"
                        title="Save count"
                    >
                        <Save size={18} />
                    </button>
                </div>
            )}
        </div>
    );
}
