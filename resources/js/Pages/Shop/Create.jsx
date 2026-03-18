import React, { useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { router } from "@inertiajs/react";

export default function Create({ auth }) {
    const [name, setName] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        // Post directly to the correct URL
        router.post("/owner/shops", { name });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <h1 className="text-2xl font-bold mb-4">Create a Shop</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block font-medium">Shop Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border rounded px-3 py-2 w-full"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Create Shop
                </button>
            </form>
        </AuthenticatedLayout>
    );
}
