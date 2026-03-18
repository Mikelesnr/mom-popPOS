import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

export default function Cashier({ auth }) {
    return (
        <AuthenticatedLayout user={auth.user}>
            <h1 className="text-2xl font-bold">Cashier Dashboard</h1>
            <p>Process sales and view your shift summary.</p>
        </AuthenticatedLayout>
    );
}
