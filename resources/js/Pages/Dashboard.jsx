import React, { useEffect } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";

// Import clean, modular views from the new Dashboards subfolder
import AdminDashboard from "./Dashboards/Admin";
import OwnerDashboard from "./Dashboards/Owner";
import ShopManagerDashboard from "./Dashboards/ShopManager";
import ManagerDashboard from "./Dashboards/Manger"; // Matches your Manger.jsx filename
import CashierDashboard from "./Dashboards/Cashier";

export default function Dashboard({ auth, shopId, shops }) {
    // PRESERVE DEVICE TERMINAL PROVISIONING:
    // Automatically binds physical device terminal metrics context to localStorage on shift mount.
    useEffect(() => {
        if (shopId) {
            localStorage.setItem("terminal_shop_id", shopId);
            console.log(
                "Terminal successfully provisioned for Shop ID:",
                shopId,
            );
        }
    }, [shopId]);

    const userRole = auth.user.role;

    // Dynamically render the dashboard corresponding to exact operational permissions
    const renderContent = () => {
        switch (userRole) {
            case "admin":
            case "system_staff":
            case "system_technician":
            case "system_accountant":
                return <AdminDashboard auth={auth} />;

            case "owner":
                return <OwnerDashboard auth={auth} shops={shops || []} />;

            case "shop_manager":
                return <ShopManagerDashboard auth={auth} />;

            case "manager":
                return <ManagerDashboard auth={auth} />;

            // Cashiers, Bartenders, and Waiters share the lightning-fast sales dashboard
            case "cashier":
            case "bartender":
            case "waiter":
                return <CashierDashboard auth={auth} />;

            case "staff":
                // General staff: purely a minimal, isolated clock-in / clock-out workspace card
                return (
                    <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                            Attendance Terminal
                        </h3>
                        <p className="text-xs text-gray-500 mb-6">
                            Logged in as: {auth.user.name}
                        </p>

                        <div className="space-y-3">
                            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-sm">
                                Clock In for Shift
                            </button>
                            <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors">
                                Clock Out / Take Break
                            </button>
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6 text-center text-gray-500">
                        Unrecognized personnel role assignment. Please contact
                        system support.
                    </div>
                );
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    {userRole.toUpperCase().replace("_", " ")} Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-6 max-w-7xl mx-auto sm:px-6 lg:px-8">
                {renderContent()}
            </div>
        </AuthenticatedLayout>
    );
}
