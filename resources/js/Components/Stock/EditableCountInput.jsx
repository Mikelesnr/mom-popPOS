import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
    Save,
    Edit2,
    XCircle,
    MinusCircle,
    Lock,
    Scale,
    Wine,
    AlertTriangle,
} from "lucide-react";

import ShotCounter from "@/Utils/ShotCounter";
import { saveStockCountLocal, deleteStockCountLocal } from "@/Utils/db";
import SpiritWeightPopup from "./SpiritWeightPopup";

export default function EditableCountInput({
    item,
    onUpdate,
    shopShotSizeMl,
    isLocked,
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [showWeightPopup, setShowWeightPopup] = useState(false);

    const isBottle = ShotCounter.isBottleProduct(item.catalog_data);

    const [localFullBottles, setLocalFullBottles] = useState(
        item.ui_state.full_bottles || "",
    );
    const [localShots, setLocalShots] = useState(item.ui_state.shots || "");
    const [localEachCount, setLocalEachCount] = useState(
        item.ui_state.each_count || "",
    );

    const shopType = localStorage.getItem("terminal_shop_type");
    const isShopMode = shopType === "shop";

    useEffect(() => {
        if (!isEditing) {
            setLocalFullBottles(item.ui_state.full_bottles || "");
            setLocalShots(item.ui_state.shots || "");
            setLocalEachCount(item.ui_state.each_count || "");
        }
    }, [item.ui_state, isEditing]);

    const performSave = async (totalShots, newUiState) => {
        if (isLocked) return;

        try {
            // Saving totalShots directly to Dexie as you requested
            await saveStockCountLocal(item.id, totalShots);
            onUpdate(item.id, newUiState);
            setIsEditing(false);
        } catch (err) {
            console.error("Error saving count:", err);
            toast.error("Failed to save count.");
        }
    };

    const handleSaveDirect = () => {
        if (isBottle) {
            const fBottles = parseInt(localFullBottles) || 0;
            const pShots = parseInt(localShots) || 0;

            const totalShots =
                ShotCounter.calculateShotsFromFullBottles(
                    fBottles,
                    item.catalog_data.bottle_specs,
                    shopShotSizeMl,
                ) + pShots;

            performSave(totalShots, {
                full_bottles: fBottles,
                shots: pShots,
                each_count: null,
            });
        } else {
            const count = parseFloat(localEachCount) || 0;
            performSave(count, {
                each_count: count,
                shots: null,
                full_bottles: null,
            });
        }
    };

    const handlePopupApply = (calculatedShotsFromWeight) => {
        setLocalShots(calculatedShotsFromWeight.toString());
        setShowWeightPopup(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        if (isLocked) return;
        setLocalFullBottles("");
        setLocalShots("");
        setLocalEachCount("");
    };

    const handleUnlock = (e) => {
        e.stopPropagation();
        if (!isLocked) return;
        toast((t) => (
            <div className="flex flex-col gap-3">
                <p className="font-medium text-gray-900">
                    Unlock <span className="font-bold">{item.name}</span>?
                </p>
                <div className="flex justify-end gap-2 mt-1">
                    <button
                        className="px-3 py-1 bg-gray-100 rounded text-sm"
                        onClick={() => toast.dismiss(t.id)}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                        onClick={async () => {
                            toast.dismiss(t.id);
                            await deleteStockCountLocal(item.id);
                            onUpdate(item.id, {
                                shots: null,
                                each_count: null,
                                full_bottles: null,
                            });
                        }}
                    >
                        Yes, Unlock
                    </button>
                </div>
            </div>
        ));
    };

    if (isLocked) {
        const displayValue = isBottle
            ? `${item.ui_state.shots ?? "0"} shots (+${item.ui_state.full_bottles ?? "0"} full)`
            : `${item.ui_state.each_count ?? "0"} units`;
        return (
            <div className="w-full h-full px-3 py-2.5 text-right font-mono tabular-nums border-b border-gray-100 bg-amber-50 text-amber-900 flex items-center justify-end gap-1.5 rounded-md">
                <Lock size={14} />
                <span className="truncate text-sm">{displayValue}</span>
                <button
                    onClick={handleUnlock}
                    className="text-gray-400 hover:text-red-600"
                >
                    <XCircle size={16} />
                </button>
            </div>
        );
    }

    if (!isEditing) {
        const hasBeenCounted = isBottle
            ? item.ui_state.shots !== null ||
              item.ui_state.full_bottles !== null
            : item.ui_state.each_count !== null;
        const displayValue = isBottle
            ? `${item.ui_state.shots ?? "0"} shots (+${item.ui_state.full_bottles ?? "0"} full)`
            : `${item.ui_state.each_count ?? "0"} units`;

        return (
            <div
                onClick={() => setIsEditing(true)}
                className={`w-full h-full px-3 py-2.5 cursor-pointer text-right font-mono border-b rounded-md hover:bg-blue-50 ${!hasBeenCounted ? "text-gray-400" : "text-gray-900"}`}
            >
                <div className="flex items-center justify-end gap-1.5">
                    <span className="truncate text-sm">{displayValue}</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="absolute inset-0 z-20 bg-white p-1 shadow-xl border-2 border-blue-400 rounded-md flex items-center gap-1.5">
                <button
                    onClick={handleClear}
                    className="text-gray-300 hover:text-red-500"
                >
                    <MinusCircle size={18} />
                </button>
                {isBottle && !isShopMode ? (
                    <div className="flex w-full gap-1 items-center">
                        <input
                            type="number"
                            placeholder="Full"
                            value={localFullBottles}
                            onChange={(e) =>
                                setLocalFullBottles(e.target.value)
                            }
                            className="w-1/4 p-1 text-sm border rounded"
                        />
                        <input
                            type="number"
                            placeholder="Shots"
                            value={localShots}
                            onChange={(e) => setLocalShots(e.target.value)}
                            className="w-1/4 p-1 text-sm border rounded"
                        />
                        <button
                            onClick={() => setShowWeightPopup(true)}
                            className="p-2 bg-gray-100 rounded"
                        >
                            <Scale size={16} />
                        </button>
                        <button
                            onClick={handleSaveDirect}
                            className="p-2 bg-blue-600 text-white rounded"
                        >
                            <Save size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="flex w-full gap-1 items-center">
                        <input
                            type="number"
                            value={localEachCount}
                            onChange={(e) => setLocalEachCount(e.target.value)}
                            className="w-full p-1 text-sm border rounded"
                        />
                        <button
                            onClick={handleSaveDirect}
                            className="p-2 bg-blue-600 text-white rounded"
                        >
                            <Save size={16} />
                        </button>
                    </div>
                )}
            </div>
            {showWeightPopup && (
                <SpiritWeightPopup
                    product={item}
                    shopShotSizeMl={shopShotSizeMl}
                    onApply={handlePopupApply}
                    onClose={() => setShowWeightPopup(false)}
                />
            )}
        </>
    );
}
