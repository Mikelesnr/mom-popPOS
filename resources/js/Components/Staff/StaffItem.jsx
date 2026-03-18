import React from "react";
import { router } from "@inertiajs/react";

export default function StaffItem({ user, shopId }) {
    return (
        <li>
            {user.name} ({user.role})
            <button
                onClick={() =>
                    router.delete(`/owner/shops/${shopId}/staff/${user.id}`)
                }
                className="ml-2 text-red-600 hover:underline"
            >
                Fire
            </button>
            <button
                onClick={() =>
                    router.patch(
                        `/owner/shops/${shopId}/staff/${user.id}/role`,
                        {
                            role:
                                user.role === "manager" ? "cashier" : "manager",
                        },
                    )
                }
                className="ml-2 text-blue-600 hover:underline"
            >
                Change Role
            </button>
        </li>
    );
}
