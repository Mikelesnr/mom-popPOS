import React from "react";
import { qty } from "./helpers";

export function WasteLogsCard({ wasteLogs, productNameLookup }) {
    return (
        <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
            <h2 className="font-bold text-stone-900 mb-3">
                Waste &amp; Breakages
            </h2>
            {!wasteLogs || wasteLogs.length === 0 ? (
                <p className="text-sm text-stone-500">
                    No waste logged this shift.
                </p>
            ) : (
                <div className="space-y-2 text-sm">
                    {wasteLogs.map((log) => {
                        const productName = productNameLookup[log.product_id];
                        return (
                            <div
                                key={log.id}
                                className="flex justify-between gap-3 border-b border-stone-100 pb-2 last:border-0 last:pb-0"
                            >
                                <div className="min-w-0">
                                    <p className="text-stone-800 font-medium">
                                        {qty(log.quantity)} ×{" "}
                                        {productName || (
                                            <span className="text-stone-400 italic">
                                                Unknown item
                                            </span>
                                        )}
                                        {log.metadata && log.metadata !== "unit"
                                            ? ` (${log.metadata})`
                                            : ""}
                                    </p>
                                    <p className="text-xs text-stone-500">
                                        {log.reason}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
