import React, { useState, useEffect } from "react";
import { Link } from "@inertiajs/react";
import TerminalPointOfSale from "@/Components/Sales/TerminalPointOfSale";
import StockCountWorksheet from "@/Components/Stock/StockCountWorksheet";

export default function Cashier({ auth }) {
    const [view, setView] = useState(() => {
        return localStorage.getItem("terminalView") || "pos";
    });
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem("terminalView", view);
    }, [view]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm rounded-xl border border-gray-100 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">
                        Sales Register Terminal
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Operator: {auth.user.name}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                            Active
                        </span>
                    </div>

                    {/* Hamburger */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d={
                                    isMenuOpen
                                        ? "M6 18L18 6M6 6l12 12"
                                        : "M4 6h16M4 12h16M4 18h16"
                                }
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Collapsible Nav */}
            {isMenuOpen && (
                <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-1">
                    <button
                        onClick={() => {
                            setView("pos");
                            setIsMenuOpen(false);
                        }}
                        className={`px-4 py-2 text-left rounded-lg hover:bg-gray-50 text-sm font-medium ${
                            view === "pos" ? "bg-gray-200" : ""
                        }`}
                    >
                        POS Terminal
                    </button>
                    <button
                        onClick={() => {
                            setView("stock");
                            setIsMenuOpen(false);
                        }}
                        className={`px-4 py-2 text-left rounded-lg hover:bg-gray-50 text-sm font-medium ${
                            view === "stock" ? "bg-gray-200" : ""
                        }`}
                    >
                        Stock Count
                    </button>
                    {/* Logout */}
                    <form
                        method="post"
                        action={route("logout")}
                        onSubmit={() => localStorage.removeItem("terminalView")}
                    >
                        <button
                            type="submit"
                            className="px-4 py-2 text-left rounded-lg hover:bg-gray-50 text-sm font-medium text-red-600"
                        >
                            Log Out
                        </button>
                    </form>
                </div>
            )}

            {/* Active view */}
            <div className="transition-all">
                {view === "pos" && <TerminalPointOfSale />}
                {view === "stock" && <StockCountWorksheet />}
            </div>
        </div>
    );
}
