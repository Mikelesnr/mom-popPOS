import React, { useState } from "react";
import TerminalPointOfSale from "@/Components/Sales/TerminalPointOfSale";
import ProductForm from "@/Components/Stock/ProductForm";
import EditProductForm from "@/Components/Stock/EditProductForm";

export default function ShopManager({ auth }) {
    const [view, setView] = useState("pos"); // 'pos', 'stock', or 'edit'

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 shadow-sm rounded-xl border border-gray-100">
                <h1 className="text-2xl font-bold text-gray-900">
                    Store Management Console
                </h1>

                {/* Toggle Buttons */}
                <div className="mt-4 flex space-x-4">
                    <button
                        onClick={() => setView("pos")}
                        className={`px-4 py-2 rounded ${view === "pos" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                    >
                        POS Terminal
                    </button>
                    <button
                        onClick={() => setView("stock")}
                        className={`px-4 py-2 rounded ${view === "stock" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                    >
                        Add New Product
                    </button>
                    <button
                        onClick={() => setView("edit")}
                        className={`px-4 py-2 rounded ${view === "edit" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                    >
                        Edit Product
                    </button>
                </div>
            </div>

            {/* Conditional Rendering */}
            <div className="mt-6">
                {view === "pos" && <TerminalPointOfSale />}
                {view === "stock" && <ProductForm />}
                {view === "edit" && <EditProductForm />}
            </div>
        </div>
    );
}
