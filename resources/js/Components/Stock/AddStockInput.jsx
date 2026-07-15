import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Save, MinusCircle, PackagePlus, XCircle, Clock } from "lucide-react";

// Import BOTH utility functions needed
import { addStockLocally, deleteStockAddLocal } from "@/Utils/db";

export default function AddStockInput({ product, isLocked, onStockQueued }) {
    const [isEditing, setIsEditing] = useState(false);
    const [localQuantity, setLocalQuantity] = useState("");
    const editRef = useRef(null);

    // Reset editing state if lock status changes externally
    useEffect(() => {
        if (isLocked) {
            setIsEditing(false);
        }
    }, [isLocked]);

    // Reset quantity when closing edit mode
    useEffect(() => {
        if (!isEditing) {
            setLocalQuantity("");
        }
    }, [isEditing]);

    // Handle clicking outside to close editing mode
    useEffect(() => {
        function handleClickOutside(event) {
            if (editRef.current && !editRef.current.contains(event.target)) {
                setIsEditing(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [editRef]);

    const handleSaveToDexie = async (e) => {
        e.stopPropagation();
        if (isLocked) return;

        const qty = parseFloat(localQuantity);

        if (isNaN(qty) || qty <= 0) {
            toast.error("Please enter a valid quantity.");
            return;
        }

        try {
            await addStockLocally(product, qty);
            toast.success(`+${qty} queued.`);
            setLocalQuantity("");
            setIsEditing(false);

            // CRITICAL CALLBACK: Notify parent to lock UI
            if (onStockQueued) onStockQueued(product.id, true);
        } catch (err) {
            console.error("Error queuing stock:", err);
            toast.error("Failed to queue.");
        }
    };

    // --- FIXED: Handle Unlock (Delete from Dexie and notify parent) ---
    const handleUnlock = async (e) => {
        e.stopPropagation(); // Prevent triggering row clicks
        console.log("Unlock clicked for P:", product.id); // Debug log

        if (!isLocked) return;

        try {
            // 1. Delete from local database
            await deleteStockAddLocal(product.id);
            console.log("Record deleted from Dexie");

            // 2. CRITICAL CALLBACK: Notify parent to unlock UI immediately
            if (onStockQueued) {
                onStockQueued(product.id, false); // Pass false for unlocked
            } else {
                console.error(
                    "ERROR: onStockQueued callback NOT provided to Input",
                );
            }

            toast.success("Item unlocked.");
        } catch (err) {
            console.error("Error unlocking item:", err);
            toast.error("Failed to unlock.");
        }
    };
    // ------------------------------------------------------------------

    const handleClear = (e) => {
        e.stopPropagation();
        setLocalQuantity("");
        document.getElementById(`input-${product.id}`)?.focus();
    };

    const handleInputClick = (e) => e.stopPropagation();

    // --- RENDER LOGIC ---

    // 1. LOCKED STATE (Queued) - Shows Clock and X button
    if (isLocked) {
        return (
            <div className="w-full h-full px-3 py-2 text-right font-mono tabular-nums border border-green-200 bg-green-50 text-green-900 flex items-center justify-end gap-1.5 rounded-lg shadow-inner animate-in fade-in">
                <Clock size={15} className="text-green-600 flex-shrink-0" />
                <span className="truncate text-sm font-medium">Queued</span>
                <button
                    onClick={handleUnlock} // ATTACHED CORRECTLY HERE
                    type="button" // Explicitly set type
                    className="text-gray-400 hover:text-red-600 p-0.5 flex-shrink-0 ml-1 z-10"
                    title="Click to unlock and edit"
                >
                    <XCircle size={18} />
                </button>
            </div>
        );
    }

    // 2. EDIT MODE
    if (isEditing) {
        return (
            <div
                ref={editRef}
                className="absolute inset-0 z-20 bg-white p-1 shadow-2xl border-2 border-green-400 rounded-xl flex items-center gap-1.5 animate-in fade-in h-full"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={handleClear}
                    type="button"
                    className="text-gray-300 hover:text-red-500 p-1 flex-shrink-0 rounded-full hover:bg-red-50"
                    title="Clear input"
                >
                    <MinusCircle size={20} />
                </button>

                <div className="flex w-full gap-1.5 items-center h-full">
                    <div className="flex flex-col w-full gap-0.5 justify-center h-full">
                        <label
                            htmlFor={`input-${product.id}`}
                            className="text-[9px] text-green-900 font-bold px-1 uppercase tracking-wider"
                        >
                            ADD QTY
                        </label>
                        <input
                            id={`input-${product.id}`}
                            type="number"
                            inputMode="decimal"
                            value={localQuantity}
                            onChange={(e) => setLocalQuantity(e.target.value)}
                            min="0.01"
                            step="any"
                            placeholder="0.00"
                            className="w-full text-sm p-1.5 border rounded-md border-green-300 bg-green-50 text-green-950 focus:ring-1 focus:ring-green-400 focus:border-green-400 font-bold h-8"
                            autoFocus
                            onClick={handleInputClick}
                        />
                    </div>
                    <button
                        onClick={handleSaveToDexie}
                        type="button"
                        className="bg-green-600 text-white p-2 rounded-md h-full flex items-center self-center hover:bg-green-700 flex-shrink-0 shadow mt-3"
                        title="Queue addition"
                    >
                        <Save size={20} />
                    </button>
                </div>
            </div>
        );
    }

    // 3. DEFAULT DISPLAY MODE
    return (
        <div
            onClick={() => setIsEditing(true)}
            className="group w-full h-full px-3 py-2 cursor-pointer text-right font-mono tabular-nums border border-gray-200 rounded-lg bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-600 shadow-inner transition-colors duration-150"
        >
            <div className="flex items-center justify-end h-full gap-2">
                <span className="text-sm font-medium truncate">Tap to add</span>
                <PackagePlus
                    size={16}
                    className="text-gray-300 group-hover:text-green-500 flex-shrink-0"
                />
            </div>
        </div>
    );
}
