import React from "react";

export default function Admin({ auth }) {
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 shadow-sm rounded-xl border border-gray-100">
                <h1 className="text-2xl font-bold text-gray-900">
                    System Admin Dashboard
                </h1>
                <p className="text-gray-600 text-sm mt-1">
                    Global platform operations context. Configure global
                    settings, manage master tenant accounts, and oversee system
                    architecture health.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="p-5 bg-white shadow-sm rounded-xl border border-gray-100 hover:border-indigo-500 transition-all">
                    <h2 className="font-semibold text-gray-800 text-base">
                        System Settings
                    </h2>
                    <p className="text-gray-500 text-xs mt-1">
                        Access global environment properties and feature
                        toggles.
                    </p>
                </div>
                <div className="p-5 bg-white shadow-sm rounded-xl border border-gray-100 hover:border-indigo-500 transition-all">
                    <h2 className="font-semibold text-gray-800 text-base">
                        User Management
                    </h2>
                    <p className="text-gray-500 text-xs mt-1">
                        Audit, modify, or provision cross-tenant system profile
                        access.
                    </p>
                </div>
                <div className="p-5 bg-white shadow-sm rounded-xl border border-gray-100 hover:border-indigo-500 transition-all">
                    <h2 className="font-semibold text-gray-800 text-base">
                        Audit Performance Logs
                    </h2>
                    <p className="text-gray-500 text-xs mt-1">
                        Review live telemetry, error flags, and secure operation
                        trails.
                    </p>
                </div>
            </div>
        </div>
    );
}
