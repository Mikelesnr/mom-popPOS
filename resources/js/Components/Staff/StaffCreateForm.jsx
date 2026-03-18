import React, { useState } from "react";
import { router } from "@inertiajs/react";

export default function StaffCreateForm({ shops }) {
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "manager",
        shop_id: "",
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        router.post(`/owner/shops/${form.shop_id}/staff`, form);
    };

    return (
        <div className="p-4 bg-white shadow rounded">
            <h2 className="font-semibold mb-2">Add Staff</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block font-medium">Name</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                        }
                        className="border rounded px-3 py-2 w-full"
                        required
                    />
                </div>
                <div>
                    <label className="block font-medium">Email</label>
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                        }
                        className="border rounded px-3 py-2 w-full"
                        required
                    />
                </div>
                <div>
                    <label className="block font-medium">Password</label>
                    <input
                        type="password"
                        value={form.password}
                        onChange={(e) =>
                            setForm({ ...form, password: e.target.value })
                        }
                        className="border rounded px-3 py-2 w-full"
                        required
                    />
                </div>
                <div>
                    <label className="block font-medium">Role</label>
                    <select
                        value={form.role}
                        onChange={(e) =>
                            setForm({ ...form, role: e.target.value })
                        }
                        className="border rounded px-3 py-2 w-full"
                    >
                        <option value="manager">Manager</option>
                        <option value="cashier">Cashier</option>
                    </select>
                </div>
                <div>
                    <label className="block font-medium">Shop</label>
                    <select
                        value={form.shop_id}
                        onChange={(e) =>
                            setForm({ ...form, shop_id: e.target.value })
                        }
                        className="border rounded px-3 py-2 w-full"
                        required
                    >
                        <option value="">Select a shop</option>
                        {shops.map((shop) => (
                            <option key={shop.id} value={shop.id}>
                                {shop.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                    + Create Staff
                </button>
            </form>
        </div>
    );
}
