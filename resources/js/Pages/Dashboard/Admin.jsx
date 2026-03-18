import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

export default function Admin({ auth }) {
    return (
        <AuthenticatedLayout user={auth.user}>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="mt-2">
                System administrators can configure global settings, manage user
                accounts, and oversee application performance.
            </p>

            <div className="mt-6 grid gap-4">
                <div className="p-4 bg-white shadow rounded">
                    <h2 className="font-semibold">System Settings</h2>
                    <p>Access and update configuration options.</p>
                </div>
                <div className="p-4 bg-white shadow rounded">
                    <h2 className="font-semibold">User Management</h2>
                    <p>Create, update, or deactivate accounts.</p>
                </div>
                <div className="p-4 bg-white shadow rounded">
                    <h2 className="font-semibold">Audit Logs</h2>
                    <p>Review system activity and security logs.</p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
