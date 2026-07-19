import React, { useMemo, useEffect, useState } from "react";
import { useForm } from "@inertiajs/react";
import toast from "react-hot-toast";

export default function StaffCreateForm({ authRole, shopType, shopId }) {
    const [localShopType, setLocalShopType] = useState(shopType);

    const { data, setData, post, processing, errors, resetAndClearErrors } =
        useForm({
            name: "",
            email: "",
            password: "",
            password_confirmation: "",
            role: "",
            shop_id: shopId || "",
            pin: "",
        });

    useEffect(() => {
        if (!shopType) {
            const terminalType = localStorage.getItem("terminal_shop_type");
            setLocalShopType(terminalType);
        }
    }, [shopType]);

    // Keep shop_id in sync if the selected shop changes after mount
    useEffect(() => {
        if (shopId) {
            setData("shop_id", shopId);
        }
    }, [shopId]);

    const availableRoles = useMemo(() => {
        let roles = [];
        if (authRole === "owner") {
            roles = ["owner", "shop_manager", "manager", "staff"];
        } else if (authRole === "shop_manager") {
            roles = ["manager", "staff"];
        } else if (authRole === "manager") {
            roles = ["staff"];
        }

        if (localShopType === "shop") {
            return roles.filter(
                (role) => !["bartender", "waiter"].includes(role),
            );
        }
        return [...roles, "bartender", "waiter"];
    }, [authRole, localShopType]);

    const submit = (e) => {
        e.preventDefault();
        post(route("staff.store"), {
            onSuccess: () => {
                resetAndClearErrors();
                toast.success("Staff member created successfully.");
            },
            onError: () => {
                toast.error("Please fix the errors below.");
            },
        });
    };

    return (
        <form
            onSubmit={submit}
            className="p-4 bg-white rounded shadow space-y-4"
        >
            {/* Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                </label>
                <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData("name", e.target.value)}
                    className="w-full border p-2 rounded"
                />
                {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                )}
            </div>

            {/* Email */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                </label>
                <input
                    type="email"
                    value={data.email}
                    onChange={(e) => setData("email", e.target.value)}
                    className="w-full border p-2 rounded"
                />
                {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                )}
            </div>

            {/* Password */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                </label>
                <input
                    type="password"
                    value={data.password}
                    onChange={(e) => setData("password", e.target.value)}
                    className="w-full border p-2 rounded"
                    autoComplete="new-password"
                />
                {errors.password && (
                    <p className="text-sm text-red-600 mt-1">
                        {errors.password}
                    </p>
                )}
            </div>

            {/* Password confirmation */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                </label>
                <input
                    type="password"
                    value={data.password_confirmation}
                    onChange={(e) =>
                        setData("password_confirmation", e.target.value)
                    }
                    className="w-full border p-2 rounded"
                    autoComplete="new-password"
                />
            </div>

            {/* PIN */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    4-Digit PIN (for terminal login)
                </label>
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    value={data.pin}
                    onChange={(e) =>
                        setData(
                            "pin",
                            e.target.value.replace(/\D/g, "").slice(0, 4),
                        )
                    }
                    className="w-full border p-2 rounded"
                />
                {errors.pin && (
                    <p className="text-sm text-red-600 mt-1">{errors.pin}</p>
                )}
            </div>

            {/* Role */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                </label>
                <select
                    value={data.role}
                    onChange={(e) => setData("role", e.target.value)}
                    className="w-full border p-2 rounded"
                >
                    <option value="">Select Role</option>
                    {(Array.isArray(availableRoles) ? availableRoles : []).map(
                        (role, index) => (
                            <option key={index} value={role}>
                                {role}
                            </option>
                        ),
                    )}
                </select>
                {errors.role && (
                    <p className="text-sm text-red-600 mt-1">{errors.role}</p>
                )}
            </div>

            {errors.shop_id && (
                <p className="text-sm text-red-600">{errors.shop_id}</p>
            )}

            <button
                type="submit"
                disabled={processing}
                className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
            >
                {processing ? "Creating..." : "Create Staff Member"}
            </button>
        </form>
    );
}
