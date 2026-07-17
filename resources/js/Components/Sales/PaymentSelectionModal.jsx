import React, { useState, useEffect, useMemo } from "react";
import { X, CircleDollarSign, Keyboard } from "lucide-react";
// Assumes NumericKeypad and CustomDropdown are in the folders indicated
import { NumericKeypad } from "@/Components/Shared/NumericKeypad";
import CustomDropdown from "@/Components/Shared/CustomDropdown";

export default function PaymentSelectionModal({
    totalAmount,
    onSelect,
    onCancel,
}) {
    const methods = ["cash", "card", "ecocash", "onemoney", "inbucks", "omari"];
    const [selectedMethod, setSelectedMethod] = useState("cash");

    // Map methods for the custom dropdown
    const methodOptions = methods.map((m) => ({
        label: m.toUpperCase(),
        value: m,
    }));

    // Cash entry state
    const [amountTendered, setAmountTendered] = useState(totalAmount);
    const [showKeypad, setShowKeypad] = useState(false);

    // Reset state when method changes
    useEffect(() => {
        if (selectedMethod === "cash") {
            setAmountTendered(totalAmount);
            setShowKeypad(false);
        } else {
            setAmountTendered(0);
            setShowKeypad(false);
        }
    }, [selectedMethod, totalAmount]);

    const changeDue = useMemo(() => {
        if (selectedMethod !== "cash") return 0;
        const tendered = parseFloat(amountTendered) || 0;
        return Math.max(0, tendered - totalAmount);
    }, [amountTendered, totalAmount, selectedMethod]);

    const isComplete = useMemo(() => {
        if (selectedMethod === "cash") {
            const tendered = parseFloat(amountTendered) || 0;
            return tendered >= totalAmount;
        }
        return true;
    }, [selectedMethod, amountTendered, totalAmount]);

    const calculateNextFive = () => {
        const next = Math.ceil(totalAmount / 5) * 5;
        return next === Math.floor(totalAmount) ? next + 5 : next;
    };
    const nextFiveAmount = calculateNextFive();

    const handleDenominationClick = (amount) => {
        setAmountTendered(amount);
        setShowKeypad(false);
    };

    const handleKeypadConfirm = (val) => {
        setAmountTendered(val);
        setShowKeypad(false);
    };

    const handleFinalize = () => {
        if (!isComplete) return;
        const tendered = parseFloat(amountTendered) || 0;
        onSelect({
            method: selectedMethod,
            amount_tendered: selectedMethod === "cash" ? tendered : totalAmount,
            change_due:
                selectedMethod === "cash"
                    ? Math.max(0, tendered - totalAmount)
                    : 0,
            total_paid:
                selectedMethod === "cash"
                    ? Math.min(tendered, totalAmount)
                    : totalAmount,
        });
    };

    const inputBtnBase =
        "col-span-1 p-3.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-base text-gray-950 border border-gray-200 active:scale-95 shadow-sm";
    const quickPayBtnBase =
        "col-span-1 p-3.5 rounded-lg font-bold text-sm border shadow-sm";

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in transition-opacity">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 animate-slide-up overflow-hidden flex flex-col max-h-[95vh]">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0">
                    <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        <CircleDollarSign
                            size={20}
                            className="text-amber-500"
                        />
                        Record Payment
                    </h2>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-5 overflow-y-auto">
                    {/* Method Selection (CustomDropdown) */}
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                            Payment Method
                        </label>
                        <div className="w-full sm:w-3/4 mx-auto">
                            <CustomDropdown
                                options={methodOptions}
                                value={selectedMethod}
                                onChange={(val) => setSelectedMethod(val)}
                                placeholder="Select Method"
                            />
                        </div>
                    </div>

                    {selectedMethod === "cash" && (
                        <div className="space-y-4 pt-4 border-t border-gray-100 animate-fade-in">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-1 p-3 bg-indigo-50 rounded-lg border border-indigo-100 text-center">
                                    <div className="text-xs text-indigo-600 font-medium">
                                        Amount Due
                                    </div>
                                    <div className="text-2xl font-extrabold text-indigo-950 tabular-nums">
                                        ${totalAmount.toFixed(2)}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowKeypad(!showKeypad)}
                                    className={`col-span-1 p-3 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${showKeypad ? "bg-indigo-100 text-indigo-800 border border-indigo-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"}`}
                                >
                                    <Keyboard size={16} />
                                    {showKeypad
                                        ? "Hide Keypad"
                                        : "Custom Amount"}
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-2">
                                <button
                                    onClick={() =>
                                        handleDenominationClick(nextFiveAmount)
                                    }
                                    className={`${quickPayBtnBase} bg-sky-50 text-sky-900 border-sky-100 hover:bg-sky-100`}
                                >
                                    Quick Pay (${nextFiveAmount.toFixed(2)})
                                </button>
                                <button
                                    onClick={() => handleDenominationClick(20)}
                                    className={inputBtnBase}
                                >
                                    $20
                                </button>
                                <button
                                    onClick={() => handleDenominationClick(50)}
                                    className={inputBtnBase}
                                >
                                    $50
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleDenominationClick(100)}
                                    className={inputBtnBase}
                                >
                                    $100
                                </button>
                                <button
                                    onClick={() =>
                                        handleDenominationClick(totalAmount)
                                    }
                                    className={`${quickPayBtnBase} bg-amber-50 text-amber-900 border-amber-100 hover:bg-amber-100`}
                                >
                                    Exact Amount
                                </button>
                            </div>

                            {showKeypad && (
                                <div className="animate-fade-in border-t pt-3 mt-2 bg-gray-50 p-3 rounded-xl shadow-inner border border-gray-100">
                                    <p className="text-xs font-semibold text-gray-600 mb-2 text-center">
                                        Enter Cash Received
                                    </p>
                                    <NumericKeypad
                                        onConfirm={handleKeypadConfirm}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 mt-1">
                                <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
                                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                                        Tendered
                                    </div>
                                    <div className="text-2xl font-extrabold text-gray-950 tabular-nums">
                                        ${amountTendered.toFixed(2)}
                                    </div>
                                </div>
                                <div
                                    className={`p-3 rounded-lg border-2 ${changeDue > 0 ? "bg-green-50 border-green-200" : "bg-gray-100 border-gray-200"}`}
                                >
                                    <div
                                        className={`text-xs font-medium uppercase tracking-wider ${changeDue > 0 ? "text-green-800" : "text-gray-500"}`}
                                    >
                                        Change
                                    </div>
                                    <div
                                        className={`text-2xl font-extrabold tabular-nums ${changeDue > 0 ? "text-green-700" : "text-gray-400"}`}
                                    >
                                        ${changeDue.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedMethod !== "cash" && (
                        <div className="text-center py-6 text-gray-600 bg-gray-50 rounded-lg border border-gray-100 animate-fade-in">
                            Record as{" "}
                            <span className="font-bold uppercase">
                                {selectedMethod}
                            </span>{" "}
                            payment.
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3 shrink-0 mt-auto">
                    <button
                        onClick={onCancel}
                        className="flex-1 p-2.5 bg-white text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors border border-gray-200 text-center text-sm shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleFinalize}
                        disabled={!isComplete}
                        className="flex-1 p-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-semibold transition-colors disabled:bg-gray-300 disabled:text-gray-500 text-center text-sm shadow-sm"
                    >
                        Save Sale
                    </button>
                </div>
            </div>
        </div>
    );
}
