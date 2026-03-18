import React from "react";
import ShopItem from "./ShopItem";

export default function ShopList({ shops }) {
    return (
        <div className="p-4 bg-white shadow rounded">
            <h2 className="font-semibold mb-2">Your Shops</h2>
            {shops && shops.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                    {shops.map((shop) => (
                        <ShopItem key={shop.id} shop={shop} />
                    ))}
                </ul>
            ) : (
                <p className="text-gray-600">No shops created yet.</p>
            )}
        </div>
    );
}
