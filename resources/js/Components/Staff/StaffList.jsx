import React, { useEffect, useState, useCallback } from "react";
import { useForm } from "@inertiajs/react";
import toast from "react-hot-toast";
import axios from "axios";

const ROLE_LABELS = {
    owner: "Owner",
    shop_manager: "Shop Manager",
    manager: "Manager",
    staff: "Staff",
    bartender: "Bartender",
    waiter: "Waiter",
};

function StaffRow({ member, authRole, availableRoles, onDeleted }) {
    const [editing, setEditing] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const {
        data,
        setData,
        patch,
        processing: saving,
        errors,
        reset,
    } = useForm({
        name: member.name,
        role: member.role,
        pin: "",
    });

    const { delete: destroy, processing: deleting } = useForm({});

    const saveEdit = (e) => {
        e.preventDefault();
        patch(route("staff.update", member.id), {
            preserveScroll: true,
            onSuccess: () => {
                setEditing(false);
                toast.success(`${member.name} updated.`);
            },
            onError: () => {
                toast.error("Please fix the errors below.");
            },
        });
    };

    const confirmDelete = () => {
        destroy(route("staff.destroy", member.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`${member.name} removed.`);
                onDeleted(member.id);
            },
            onError: () => {
                toast.error("Could not remove staff member.");
            },
        });
    };

    if (editing) {
        return (
            <form
                onSubmit={saveEdit}
                className="p-3 sm:p-4 border rounded-lg bg-emerald-50 border-emerald-200 space-y-3"
            >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            Name
                        </label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData("name", e.target.value)}
                            className="w-full border rounded p-2 text-sm"
                        />
                        {errors.name && (
                            <p className="text-xs text-red-600 mt-1">
                                {errors.name}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            Role
                        </label>
                        <select
                            value={data.role}
                            onChange={(e) => setData("role", e.target.value)}
                            className="w-full border rounded p-2 text-sm"
                        >
                            {availableRoles.map((role) => (
                                <option key={role} value={role}>
                                    {ROLE_LABELS[role] || role}
                                </option>
                            ))}
                        </select>
                        {errors.role && (
                            <p className="text-xs text-red-600 mt-1">
                                {errors.role}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            New PIN (optional)
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="Leave blank to keep"
                            value={data.pin}
                            onChange={(e) =>
                                setData(
                                    "pin",
                                    e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 4),
                                )
                            }
                            className="w-full border rounded p-2 text-sm"
                        />
                        {errors.pin && (
                            <p className="text-xs text-red-600 mt-1">
                                {errors.pin}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 justify-end">
                    <button
                        type="button"
                        onClick={() => {
                            setEditing(false);
                            reset();
                        }}
                        className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save changes"}
                    </button>
                </div>
            </form>
        );
    }

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg bg-white hover:border-gray-300 transition">
            <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                    {member.name}
                </p>
                <p className="text-sm text-gray-500 truncate">{member.email}</p>
                <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    {ROLE_LABELS[member.role] || member.role}
                </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {confirmingDelete ? (
                    <>
                        <span className="text-xs text-gray-500 mr-1 hidden sm:inline">
                            Remove access?
                        </span>
                        <button
                            onClick={() => setConfirmingDelete(false)}
                            className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={deleting}
                            className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                        >
                            {deleting ? "Removing..." : "Confirm"}
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setEditing(true)}
                            className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100 transition"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => setConfirmingDelete(true)}
                            className="px-3 py-1.5 text-sm rounded border border-red-200 text-red-600 hover:bg-red-50 transition"
                        >
                            Remove
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function StaffList({ shopId, authRole, shopType }) {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    const availableRoles = React.useMemo(() => {
        let roles = [];
        if (authRole === "owner") {
            roles = ["owner", "shop_manager", "manager", "staff"];
        } else if (authRole === "shop_manager") {
            roles = ["manager", "staff"];
        } else if (authRole === "manager") {
            roles = ["staff"];
        }
        if (shopType === "shop") {
            return roles.filter((r) => !["bartender", "waiter"].includes(r));
        }
        return [...roles, "bartender", "waiter"];
    }, [authRole, shopType]);

    const fetchStaff = useCallback(() => {
        if (!shopId) return;
        setLoading(true);
        setLoadError(null);
        axios
            .get(route("staff.index"), { params: { shop_id: shopId } })
            .then((res) => setStaff(res.data))
            .catch(() => setLoadError("Could not load staff for this shop."))
            .finally(() => setLoading(false));
    }, [shopId]);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const handleDeleted = (id) => {
        setStaff((prev) => prev.filter((m) => m.id !== id));
    };

    if (loading) {
        return (
            <div className="space-y-2">
                {[1, 2].map((i) => (
                    <div
                        key={i}
                        className="h-16 rounded-lg bg-gray-100 animate-pulse"
                    />
                ))}
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {loadError}
            </div>
        );
    }

    if (staff.length === 0) {
        return (
            <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-center">
                No staff added to this shop yet.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {staff.map((member) => (
                <StaffRow
                    key={member.id}
                    member={member}
                    authRole={authRole}
                    availableRoles={availableRoles}
                    onDeleted={handleDeleted}
                />
            ))}
        </div>
    );
}
