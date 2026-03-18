import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Link } from "@inertiajs/react";
import ShopList from "@/Components/Shop/ShopList";
import StaffCreateForm from "@/Components/Staff/StaffCreateForm";

export default function Owner({ auth, shops }) {
    return (
        <AuthenticatedLayout user={auth.user}>
            <h1 className="text-2xl font-bold mb-4">Owner Dashboard</h1>
            <p className="mb-6">
                Manage shops, view metrics, and oversee staff.
            </p>

            <div className="space-y-6">
                <Link
                    href="/owner/shops/create"
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    + Create New Shop
                </Link>

                <ShopList shops={shops} />
                <StaffCreateForm shops={shops} />
            </div>
        </AuthenticatedLayout>
    );
}
