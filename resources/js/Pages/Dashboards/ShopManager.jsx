import React, { useState } from "react";
import TerminalPointOfSale from "@/Components/Sales/TerminalPointOfSale";
import ProductForm from "@/Components/Stock/ProductForm";
import EditProductForm from "@/Components/Stock/EditProductForm";
import AddStockWorksheet from "@/Components/Stock/AddStockWorksheet";
import WasteLogForm from "@/Components/Stock/WasteLogForm";
import StockCountWorksheet from "@/Components/Stock/StockCountWorksheet";
import Cashup from "@/Components/Cashup/Cashup";
import ExpenseManager from "@/Components/Expenses/ExpenseManager";
import AllTables from "@/Components/Sales/ALLTables";

const NAV_ITEMS = [
    { key: "pos", label: "POS Terminal" },
    { key: "stock", label: "Add Product" },
    { key: "edit", label: "Edit Product" },
    { key: "add-stock", label: "Add Stock" },
    { key: "waste-log", label: "Waste Log" },
    { key: "stock-count", label: "Stock Count" },
    { key: "cashup", label: "Cashup" },
    { key: "expense", label: "Expenses" },
    { key: "tables", label: "Tables" },
];

export default function ShopManager({ auth }) {
    const [view, setView] = useState("pos");
    const [isMenuOpen, setIsMenuOpen] = useState(false); // Toggle state for hamburger menu

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

                {/* Hamburger Button (Visible only on mobile) */}
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="sm:hidden p-2 text-white rounded-md hover:bg-[#1b483e]"
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

            {/* Nav: Hamburger Menu Logic */}
            <div
                className={`${isMenuOpen ? "block" : "hidden"} sm:block bg-white border-b border-stone-200 shadow-sm sticky top-0 z-50`}
            >
                <div className="flex flex-col sm:flex-row gap-2 px-4 py-3 sm:px-6">
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.key}
                            onClick={() => {
                                setView(item.key);
                                setIsMenuOpen(false); // Close menu on selection
                            }}
                            className={`w-full sm:w-auto text-left sm:text-center rounded-lg px-4 py-3 sm:py-2.5 font-medium transition-colors ${
                                view === item.key
                                    ? "bg-[#14352E] text-white"
                                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

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
                {view === "tables" && <AllTables />}
            </div>
        </div>
    );
}
