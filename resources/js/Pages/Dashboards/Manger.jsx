import React, { useState, useEffect } from "react";
import { Link } from "@inertiajs/react";
import TerminalPointOfSale from "@/Components/Sales/TerminalPointOfSale";
import ProductForm from "@/Components/Stock/ProductForm";
import EditProductForm from "@/Components/Stock/EditProductForm";
import AddStockWorksheet from "@/Components/Stock/AddStockWorksheet";
import WasteLogForm from "@/Components/Stock/WasteLogForm";
import StockCountWorksheet from "@/Components/Stock/StockCountWorksheet";
import Cashup from "@/Components/Cashup/Cashup";
import ExpenseManager from "@/Components/Expenses/ExpenseManager";

const NAV_ITEMS = [
    { key: "pos", label: "POS Terminal" },
    { key: "stock", label: "Add Product" },
    { key: "edit", label: "Edit Product" },
    { key: "add-stock", label: "Add Stock" },
    { key: "waste-log", label: "Waste Log" },
    { key: "stock-count", label: "Stock Count" },
    { key: "cashup", label: "Cashup" },
    { key: "expense", label: "Expenses" },
];

export default function Manager({ auth }) {
    const [view, setView] = useState(() => {
        return localStorage.getItem("terminalView") || "pos";
    });
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem("terminalView", view);
    }, [view]);

    return (
        <div className="min-h-screen bg-stone-50">
            {/* Header */}
            <div className="bg-[#14352E] px-4 py-5 sm:px-6 sm:py-6 flex justify-between items-center">
                <div>
                    <p className="text-xs uppercase tracking-widest text-emerald-300/80 mb-1">
                        Mom&amp;Pop POS
                    </p>
                    <h1 className="text-xl sm:text-2xl font-bold text-white">
                        Store Management Console
                    </h1>
                </div>

                {/* Hamburger */}
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 text-white rounded-md hover:bg-[#1b483e]"
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

            {/* Collapsible Nav */}
            {isMenuOpen && (
                <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-1">
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.key}
                            onClick={() => {
                                setView(item.key);
                                setIsMenuOpen(false);
                            }}
                            className={`px-4 py-2 text-left rounded-lg hover:bg-gray-50 text-sm font-medium ${
                                view === item.key
                                    ? "bg-[#14352E] text-white"
                                    : "text-stone-700"
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}

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
            <div className="p-4 sm:p-6">
                {view === "pos" && <TerminalPointOfSale />}
                {view === "stock" && <ProductForm />}
                {view === "edit" && <EditProductForm />}
                {view === "add-stock" && <AddStockWorksheet />}
                {view === "waste-log" && <WasteLogForm />}
                {view === "stock-count" && <StockCountWorksheet />}
                {view === "cashup" && <Cashup />}
                {view === "expense" && <ExpenseManager />}
            </div>
        </div>
    );
}
