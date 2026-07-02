import React from "react";
import TerminalPointOfSale from "@/Components/Sales/TerminalPointOfSale";

export default function ShopManager({ auth }) {
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 shadow-sm rounded-xl border border-gray-100">
                <h1 className="text-2xl font-bold text-gray-900">
                    Store Management Console
                </h1>
                <p className="text-gray-600 text-sm mt-1">
                    Elevated storefront control. Access live auditing, oversight
                    actions, and run checkout overrides on the register terminal
                    below.
                </p>
            </div>

            {/* Seamless, encapsulated point of sale integration */}
            <TerminalPointOfSale />
        </div>
    );
}
