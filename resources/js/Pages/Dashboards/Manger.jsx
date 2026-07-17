import React, { useState } from "react";
import TerminalPointOfSale from "@/Components/Sales/TerminalPointOfSale";
import ProductForm from "@/Components/Stock/ProductForm";
import EditProductForm from "@/Components/Stock/EditProductForm";
import AddStockWorksheet from "@/Components/Stock/AddStockWorksheet";
import WasteLogForm from "@/Components/Stock/WasteLogForm";
import StockCountWorksheet from "@/Components/Stock/StockCountWorksheet";
import Cashup from "@/Components/Cashup/Cashup";

const NAV_ITEMS = [
    { key: "pos", label: "POS Terminal" },
    { key: "stock", label: "Add Product" },
    { key: "edit", label: "Edit Product" },
    { key: "add-stock", label: "Add Stock" },
    { key: "waste-log", label: "Waste Log" },
    { key: "stock-count", label: "Stock Count" },
    { key: "cashup", label: "Cashup" },
];

export default function Manager({ auth }) {
    const [view, setView] = useState("pos"); // 'pos', 'stock', or 'edit'

    return (
        <div className="min-h-screen bg-stone-50">
            {/* Header */}
            <div className="bg-[#14352E] px-4 py-5 sm:px-6 sm:py-6">
                <p className="text-xs uppercase tracking-widest text-emerald-300/80 mb-1">
                    Mom&amp;Pop POS
                </p>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                    Store Management Console
                </h1>
            </div>

            {/* Nav — horizontally scrollable pill bar on small screens,
                wraps normally once there's enough width to fit everything */}
            <div className="sticky top-0 z-10 bg-white border-b border-stone-200 shadow-sm">
                <div
                    className="flex gap-2 overflow-x-auto px-4 py-3 sm:flex-wrap sm:overflow-visible sm:px-6
                        [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.key}
                            onClick={() => setView(item.key)}
                            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2.5 min-h-[44px] text-sm font-medium transition-colors ${
                                view === item.key
                                    ? "bg-[#14352E] text-white shadow-sm"
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
            </div>
        </div>
    );
}
