import React from "react";
import { qty } from "./helpers";

export function WasteLogsCard({ wasteLogs, onPrintWaste }) {
    return (
        <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold text-stone-900">Waste & Breakages</h2>
                {/* Only show button if there is waste to print */}
                {wasteLogs?.length > 0 && (
                    <button
                        onClick={onPrintWaste}
                        className="text-xs text-[#14352E] font-medium underline"
                    >
                        Print Waste Log
                    </button>
                )}
            </div>

            <h2 className="font-bold text-stone-900 mb-3">Waste & Breakages</h2>
            {!wasteLogs || wasteLogs.length === 0 ? (
                <p className="text-sm text-stone-500">
                    No waste logged this shift.
                </p>
            ) : (
                <div className="space-y-4 text-sm">
                    {wasteLogs.map((log) => {
                        const productName = log.product
                            ? log.product.name
                            : "Unknown Item";

                        return (
                            <div
                                key={log.id}
                                className="border-b border-stone-100 pb-3 last:border-0 last:pb-0"
                            >
                                <p className="text-stone-900 font-semibold mb-1">
                                    {productName}
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-stone-400 block uppercase tracking-wider text-[10px]">
                                            Quantity
                                        </span>
                                        <span className="text-stone-700 font-mono font-medium">
                                            {qty(log.quantity)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-stone-400 block uppercase tracking-wider text-[10px]">
                                            Reason
                                        </span>
                                        <span className="text-stone-700 font-medium capitalize">
                                            {log.reason}{" "}
                                            {log.metadata &&
                                            log.metadata !== "unit"
                                                ? `(${log.metadata})`
                                                : ""}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
