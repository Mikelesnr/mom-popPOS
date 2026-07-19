import React, { useEffect } from "react";
import { useForm } from "@inertiajs/react";
import toast from "react-hot-toast"; // Import react-hot-toast

export default function CreateShopForm() {
    const { data, setData, post, processing, errors, resetAndClearErrors } =
        useForm({
            name: "",
            shop_type: "shop",
            latitude: "",
            longitude: "",
            allowed_radius: 100,
            size_ml: 25,
        });

    // Auto-fetch location on component mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setData((prev) => ({
                        ...prev,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    }));
                },
                (err) =>
                    toast.error(
                        "Could not retrieve location. Please enter manually.",
                    ),
            );
        }
    }, []);

    const submit = (e) => {
        e.preventDefault();

        post(route("shops.store"), {
            onSuccess: () => {
                // 1. Clear the form fields
                resetAndClearErrors();

                // 2. Notify the owner
                toast.success("Shop registered successfully.");
            },
            onError: () => {
                // 3. Keep data if there was an error so the user doesn't lose progress
                toast.error(
                    "Failed to register shop. Please check the form for errors.",
                );
            },
        });
    };

    return (
        <form
            onSubmit={submit}
            className="bg-[#FFFCF5] p-6 rounded-xl border border-[#D1CEC7] shadow-sm"
        >
            <h2 className="text-xl font-serif text-[#241C15] mb-4">
                Register New Location
            </h2>

            <div className="space-y-4">
                {/* Shop Name */}
                <div>
                    <label className="block text-sm font-medium text-[#241C15]">
                        Shop Name
                    </label>
                    <input
                        type="text"
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        className={`mt-1 block w-full rounded-md border-[#D1CEC7] shadow-sm ${errors.name ? "border-red-500" : ""}`}
                    />
                    {errors.name && (
                        <p className="text-red-500 text-xs mt-1">
                            {errors.name}
                        </p>
                    )}
                </div>

                {/* Shop Type */}
                <div>
                    <label className="block text-sm font-medium text-[#241C15]">
                        Shop Type
                    </label>
                    <select
                        value={data.shop_type}
                        onChange={(e) => setData("shop_type", e.target.value)}
                        className="mt-1 block w-full rounded-md border-[#D1CEC7] shadow-sm"
                    >
                        <option value="shop">Normal Shop</option>
                        <option value="bar">Bar</option>
                        <option value="restobar">Restobar</option>
                    </select>
                </div>

                {/* Conditional Shot Size */}
                {(data.shop_type === "bar" ||
                    data.shop_type === "restobar") && (
                    <div>
                        <label className="block text-sm font-medium text-[#241C15]">
                            Standard Shot Size (ml)
                        </label>
                        <input
                            type="number"
                            value={data.size_ml}
                            onChange={(e) => setData("size_ml", e.target.value)}
                            className="mt-1 block w-full rounded-md border-[#D1CEC7] shadow-sm"
                        />
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-[#123D26] text-[#FFFCF5] py-2 px-4 rounded-lg hover:bg-[#0f3320] transition-colors"
                >
                    {processing ? "Registering..." : "Create Location"}
                </button>
            </div>
        </form>
    );
}
