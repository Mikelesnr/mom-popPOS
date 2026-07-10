import React from "react";

export default function PaymentSelectionModal({ onSelect, onCancel }) {
    const methods = ["cash", "card", "omari", "ecocash", "onemoney", "inbucks"];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded-2xl w-80 space-y-3 shadow-2xl">
                <h2 className="font-bold text-lg mb-4 text-center">
                    Select Payment Method
                </h2>
                {methods.map((m) => (
                    <button
                        key={m}
                        onClick={() => onSelect(m)}
                        className="w-full p-3 bg-gray-100 hover:bg-indigo-500 hover:text-white rounded-lg uppercase font-bold transition-colors"
                    >
                        {m}
                    </button>
                ))}
                <button
                    onClick={onCancel}
                    className="w-full p-3 mt-2 text-gray-500 hover:underline"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
