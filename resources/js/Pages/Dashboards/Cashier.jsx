import React from "react";
import TerminalPointOfSale from "@/Components/Sales/TerminalPointOfSale";

export default function Cashier({ auth }) {
    return (
        <div className="space-y-4">
            {/* Minimalist layout optimized for lightning-fast frontend use by Waiters, Cashiers, and Bartenders */}
            <div className="bg-white p-4 shadow-sm rounded-xl border border-gray-100 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">
                        Sales Register Terminal
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Operator Session: {auth.user.name}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                        Terminal Active
                    </span>
                </div>
            </div>

            {/* Pure point of sale workspace grid */}
            <TerminalPointOfSale />
        </div>
    );
}
