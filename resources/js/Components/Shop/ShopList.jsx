import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/Utils/db"; // Your Dexie instance
import StaffCreateForm from "@/Components/Shop/StaffCreateForm";

export default function ShopList({ authRole }) {
    const [selectedShopId, setSelectedShopId] = useState(null);

    // Fetch shops directly from Dexie
    const shops = useLiveQuery(() => db.shops.toArray()) || [];

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold">Your Shops</h2>
            {shops.map((shop) => (
                <div
                    key={shop.id}
                    className="border p-4 rounded-lg bg-white shadow-sm"
                >
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold">{shop.name}</h3>
                        <button
                            onClick={() =>
                                setSelectedShopId(
                                    selectedShopId === shop.id ? null : shop.id,
                                )
                            }
                            className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                        >
                            {selectedShopId === shop.id ? "Close" : "Add Staff"}
                        </button>
                    </div>

                    {/* Conditional rendering of the staff form nested inside the shop context */}
                    {selectedShopId === shop.id && (
                        <div className="mt-4 p-4 bg-gray-50 border-t">
                            <StaffCreateForm
                                authRole={authRole}
                                shopType={shop.shop_type}
                                shopId={shop.id}
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
