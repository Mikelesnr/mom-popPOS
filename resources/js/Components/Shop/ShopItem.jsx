import React from "react";
import StaffList from "../Staff/StaffList";

export default function ShopItem({ shop }) {
    return (
        <li>
            <span className="font-semibold">{shop.name}</span>
            <div className="ml-4 mt-2">
                <StaffList staff={shop.staff || []} shopId={shop.id} />
            </div>
        </li>
    );
}
