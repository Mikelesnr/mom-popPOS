import React, { useState } from "react";
import { X } from "lucide-react";

export default function BottleOptionModal({ product, onClose, onSelect }) {
    const [customQty, setCustomQty] = useState("");
    const [selectedType, setSelectedType] = useState("shot");

    const handleSelection = (type, qty = 1) => {
        onSelect(product, { type: type }, parseInt(qty));
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="flex justify-between p-4 border-b bg-gray-50">
                    <h2 className="font-bold text-lg">{product.name}</h2>
                    <button onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 grid grid-cols-3 gap-2">
                    <button
                        onClick={() => setSelectedType("shot")}
                        className={`p-4 rounded-lg font-bold ${selectedType === "shot" ? "bg-indigo-600 text-white" : "bg-indigo-100"}`}
                    >
                        Shot
                    </button>
                    <button
                        onClick={() => setSelectedType("double")}
                        className={`p-4 rounded-lg font-bold ${selectedType === "double" ? "bg-indigo-600 text-white" : "bg-indigo-100"}`}
                    >
                        Double
                    </button>
                    <button
                        onClick={() => setSelectedType("bottle")}
                        className={`p-4 rounded-lg font-bold ${selectedType === "bottle" ? "bg-indigo-600 text-white" : "bg-indigo-100"}`}
                    >
                        Bottle
                    </button>
                </div>

                <div className="p-4 border-t">
                    <input
                        type="text"
                        value={customQty}
                        readOnly
                        placeholder="Qty"
                        className="w-full p-2 mb-4 text-center text-xl border rounded bg-gray-50"
                    />
                    <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                            <button
                                key={n}
                                onClick={() => setCustomQty((prev) => prev + n)}
                                className="p-3 bg-white border rounded shadow-sm font-bold"
                            >
                                {n}
                            </button>
                        ))}
                        <button
                            onClick={() => setCustomQty("")}
                            className="p-3 bg-rose-100 rounded"
                        >
                            C
                        </button>
                        <button
                            onClick={() => setCustomQty((prev) => prev + "0")}
                            className="p-3 bg-white border rounded"
                        >
                            0
                        </button>
                        <button
                            onClick={() => {
                                if (customQty)
                                    handleSelection(
                                        selectedType,
                                        parseInt(customQty),
                                    );
                            }}
                            className="p-3 bg-emerald-500 text-white rounded font-bold"
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
