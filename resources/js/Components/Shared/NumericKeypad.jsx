import React, { useState } from "react";

export const NumericKeypad = ({ onConfirm }) => {
    const [val, setVal] = useState("");

    return (
        <div className="border-t pt-4">
            <input
                value={val}
                readOnly
                className="w-full p-2 text-center text-xl border rounded mb-2"
            />
            <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <button
                        key={n}
                        onClick={() => setVal((prev) => prev + n)}
                        className="p-3 bg-gray-100 rounded font-bold"
                    >
                        {n}
                    </button>
                ))}

                {/* Standardized size for the last row */}
                <button
                    onClick={() => setVal("")}
                    className="p-3 bg-rose-100 text-rose-700 rounded font-bold"
                >
                    C
                </button>
                <button
                    onClick={() => setVal((prev) => prev + "0")}
                    className="p-3 bg-gray-100 rounded font-bold"
                >
                    0
                </button>
                <button
                    onClick={() => onConfirm(parseInt(val))}
                    className="p-3 bg-emerald-500 text-white rounded font-bold"
                >
                    OK
                </button>
            </div>
        </div>
    );
};
