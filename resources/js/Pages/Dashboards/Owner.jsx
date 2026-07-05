import React from "react";
import { Link } from "@inertiajs/react";
import ShopList from "@/Components/Shop/ShopList";
import StaffCreateForm from "@/Components/Staff/StaffCreateForm";

export default function Owner({ auth, shops }) {
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 shadow-sm rounded-xl border border-gray-100">
                <h1 className="text-2xl font-bold text-gray-900">
                    Back-Office Oversight
                </h1>
                <p className="text-gray-600 text-sm mt-1">
                    Manage your commercial ecosystem, view cross-shop insights,
                    or provision staff operational credentials.
                </p>
            </div>

            <div className="flex justify-between items-center">
                <Link
                    href="/owner/shops/create"
                    className="inline-block bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    + Register New Shop Location
                </Link>
            </div>

            {/* Existing modular multi-tenant interface parts */}
            <ShopList shops={shops} />
            <StaffCreateForm shops={shops} />
        </div>
    );
}
