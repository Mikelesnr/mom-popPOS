import React, { useEffect } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";

import AdminDashboard from "./Dashboards/Admin";
import OwnerDashboard from "./Dashboards/Owner";
import ShopManagerDashboard from "./Dashboards/ShopManager";
import ManagerDashboard from "./Dashboards/Manger";
import CashierDashboard from "./Dashboards/Cashier";

export default function Dashboard({ auth, shopId, shops, shift }) {
    useEffect(() => {
        if (shopId) {
            localStorage.setItem("terminal_shop_id", shopId);
            console.log("Terminal provisioned for Shop ID:", shopId);
        }

        if (shift) {
            const localShift = localStorage.getItem("terminal_shift_id");

            if (!localShift) {
                localStorage.setItem("terminal_shift_id", shift.id);
                console.log("Shift provisioned:", shift.id);
            } else if (localShift !== shift.id) {
                localStorage.setItem("terminal_shift_id", shift.id);
                console.log("Shift updated to:", shift.id);
            }
        } else {
            localStorage.removeItem("terminal_shift_id");
            console.log("No active shift found, cleared local shift.");
        }
    }, [shopId, shift]);

    const userRole = auth.user.role;

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
            case "cashier":
            case "bartender":
            case "waiter":
                return <CashierDashboard auth={auth} />;
            case "staff":
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
