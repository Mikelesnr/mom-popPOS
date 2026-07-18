import React from "react";
import { PAYMENT_METHODS, money } from "./helpers";

export function ShopTotalsCard({ data, shopTotal, onPrintShop }) {
    return (
        <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
            <h2 className="font-bold text-stone-900 mb-3">
                Shop Totals by Payment Method
            </h2>
            <div className="space-y-2 font-mono text-sm">
                {PAYMENT_METHODS.map((method) => (
                    <div key={method} className="flex justify-between">
                        <span className="capitalize text-stone-500 font-sans">
                            {method}
                        </span>
                        <span className="font-semibold text-stone-900">
                            {money(data.summary.totals_by_method[method])}
                        </span>
                    </div>
                ))}
            </div>
            <div className="border-t border-stone-200 mt-3 pt-3 flex justify-between font-bold text-stone-900">
                <span>Total</span>
                <span className="font-mono">{money(shopTotal)}</span>
            </div>
            <button
                onClick={onPrintShop}
                className="mt-4 w-full bg-[#14352E] hover:bg-[#0f2921] text-white text-sm font-semibold py-2.5 rounded-md transition-colors"
            >
                Print Shop X-Slip
            </button>
        </section>
    );
}
