import React, { useState } from "react";
import { Head, usePage } from "@inertiajs/react";

import ShopList from "@/Components/Shop/ShopList";
import CreateShopForm from "@/Components/Shop/CreateShopForm";

export default function Owner() {
    const { props } = usePage();
    const { shops, auth } = props;

    const [showCreateShop, setShowCreateShop] = useState(false);

    return (
        <div className="min-h-screen bg-gray-100">
            <Head title="Owner Management Portal" />

            <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                            Owner Management Portal
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Welcome back, {auth.user.name}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateShop((v) => !v)}
                        className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium shadow-sm"
                    >
                        {showCreateShop ? (
                            "Cancel"
                        ) : (
                            <>
                                <span className="text-base leading-none">
                                    +
                                </span>{" "}
                                New Shop
                            </>
                        )}
                    </button>
                </div>

                {/* Create shop panel */}
                {showCreateShop && (
                    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">
                            Register New Shop
                        </h2>
                        <CreateShopForm
                            onSuccess={() => setShowCreateShop(false)}
                        />
                    </div>
                )}

                {/* Shops + staff management */}
                <ShopList shops={shops || []} authRole={auth.user.role} />
            </div>
        </div>
    );
}
