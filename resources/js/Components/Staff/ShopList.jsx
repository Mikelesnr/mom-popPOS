import React, { useState } from "react";
import StaffCreateForm from "@/Components/Staff/StaffCreateForm";
import StaffList from "@/Components/Staff/StaffList";

const SHOP_TYPE_LABELS = {
    shop: "Shop",
    bar: "Bar",
    restaurant: "Restaurant",
};

export default function ShopList({ shops = [], authRole, onSelect, selectedShopId }) {
    const [expandedShopId, setExpandedShopId] = useState(null);
    const [tab, setTab] = useState("staff"); // "staff" | "add"

    const toggleExpanded = (shop) => {
        onSelect?.(shop);
        if (expandedShopId === shop.id) {
            setExpandedShopId(null);
        } else {
            setExpandedShopId(shop.id);
            setTab("staff");
        }
    };

    if (shops.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">
                No shops yet. Create your first shop to get started.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 px-1">
                Your Shops
            </h2>

            {shops.map((shop) => {
                const isExpanded = expandedShopId === shop.id;
                const isSelected = selectedShopId === shop.id;

                return (
                    <div
                        key={shop.id}
                        className={`rounded-xl bg-white border transition ${
                            isSelected
                                ? "border-emerald-400 ring-1 ring-emerald-100"
                                : "border-gray-200"
                        }`}
                    >
                        <button
                            onClick={() => toggleExpanded(shop)}
                            className="w-full flex items-center justify-between gap-3 p-4 text-left"
                        >
                            <div className="min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate">
                                    {shop.name}
                                </h3>
                                <span className="text-xs text-gray-500">
                                    {SHOP_TYPE_LABELS[shop.shop_type] ||
                                        shop.shop_type}
                                </span>
                            </div>
                            <svg
                                className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${
                                    isExpanded ? "rotate-180" : ""
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </button>

                        {isExpanded && (
                            <div className="border-t border-gray-100 p-4 space-y-4">
                                <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-full sm:w-fit">
                                    <button
                                        onClick={() => setTab("staff")}
                                        className={`flex-1 sm:flex-none px-3 py-1.5 text-sm rounded-md transition ${
                                            tab === "staff"
                                                ? "bg-white shadow-sm text-gray-900 font-medium"
                                                : "text-gray-500"
                                        }`}
                                    >
                                        Staff
                                    </button>
                                    <button
                                        onClick={() => setTab("add")}
                                        className={`flex-1 sm:flex-none px-3 py-1.5 text-sm rounded-md transition ${
                                            tab === "add"
                                                ? "bg-white shadow-sm text-gray-900 font-medium"
                                                : "text-gray-500"
                                        }`}
                                    >
                                        + Add Staff
                                    </button>
                                </div>

                                {tab === "staff" ? (
                                    <StaffList
                                        shopId={shop.id}
                                        authRole={authRole}
                                        shopType={shop.shop_type}
                                    />
                                ) : (
                                    <StaffCreateForm
                                        authRole={authRole}
                                        shopType={shop.shop_type}
                                        shopId={shop.id}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}