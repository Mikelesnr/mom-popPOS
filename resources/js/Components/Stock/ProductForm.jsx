import React, { useState, useEffect } from "react";
import { useForm } from "@inertiajs/react";
import { useLiveQuery } from "dexie-react-hooks";
import axios from "axios";
import { db } from "@/Utils/db";
import {
    Package,
    Scale,
    DollarSign,
    Tag,
    Beaker,
    Save,
    Loader2,
    Weight,
    Ruler,
    AlertTriangle,
} from "lucide-react";

export default function ProductForm() {
    const [isBottle, setIsBottle] = useState(false);
    const categories = useLiveQuery(() => db.categories.toArray()) || [];
    const units = useLiveQuery(() => db.units.toArray()) || [];

    // Filter units based on bottle toggle
    const filteredUnits = isBottle
        ? units
        : units.filter((u) => u.type === "unit");

    const { data, setData, post, processing } = useForm({
        name: "",
        category_id: "",
        unit_id: "",
        cost_price: "",
        selling_price: "",
        is_perishable: false,
        is_bottle: false,
        bottle: {
            capacity_ml: "",
            tare_weight_g: "",
            gross_weight_g: "",
            bottle_selling_price: "",
        },
    });

    const inputClasses =
        "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                post(route("stock.create-product"));
            }}
            className="max-w-2xl mx-auto p-6 bg-white shadow-xl rounded-2xl border border-gray-100"
        >
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Package className="text-blue-600" /> New Inventory Item
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category */}
                <div className="relative">
                    <Tag className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    <select
                        value={data.category_id}
                        onChange={(e) => setData("category_id", e.target.value)}
                        className={inputClasses}
                    >
                        <option value="">Select Category</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Name */}
                <input
                    value={data.name}
                    onChange={(e) => setData("name", e.target.value)}
                    placeholder="Product Name"
                    className={inputClasses.replace("pl-10", "pl-4")}
                />

                {/* Unit Selector */}
                <div className="relative">
                    <Ruler className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    <select
                        value={data.unit_id}
                        onChange={(e) => setData("unit_id", e.target.value)}
                        className={inputClasses}
                    >
                        <option value="">Select Unit</option>
                        {filteredUnits.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Pricing */}
                <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    <input
                        type="number"
                        value={data.cost_price}
                        onChange={(e) => setData("cost_price", e.target.value)}
                        placeholder="Cost Price"
                        className={inputClasses}
                    />
                </div>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    <input
                        type="number"
                        value={data.selling_price}
                        onChange={(e) =>
                            setData("selling_price", e.target.value)
                        }
                        placeholder="Selling Price"
                        className={inputClasses}
                    />
                </div>
            </div>

            {/* Perishable Toggle */}
            <div className="flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-white">
                <label className="flex items-center gap-2 text-gray-700">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Is Perishable?
                </label>
                <input
                    type="checkbox"
                    checked={data.is_perishable}
                    onChange={(e) => setData("is_perishable", e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                />
            </div>

            {/* Bottle Toggle */}
            <div className="my-6 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                <span className="font-medium text-gray-700">
                    Is this item a bottle?
                </span>
                <input
                    type="checkbox"
                    checked={isBottle}
                    onChange={(e) => {
                        setIsBottle(e.target.checked);
                        setData("is_bottle", e.target.checked);
                    }}
                    className="w-5 h-5 text-blue-600 cursor-pointer"
                />
            </div>

            {isBottle && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-blue-100 bg-blue-50 rounded-xl animate-in fade-in">
                    <div className="relative">
                        <Beaker className="absolute left-3 top-2.5 text-blue-400 w-5 h-5" />
                        <input
                            type="number"
                            placeholder="Capacity (ml)"
                            onChange={(e) =>
                                setData("bottle", {
                                    ...data.bottle,
                                    capacity_ml: e.target.value,
                                })
                            }
                            className={inputClasses}
                        />
                    </div>
                    <div className="relative">
                        <Weight className="absolute left-3 top-2.5 text-blue-400 w-5 h-5" />
                        <input
                            type="number"
                            placeholder="Tare Weight (g)"
                            onChange={(e) =>
                                setData("bottle", {
                                    ...data.bottle,
                                    tare_weight_g: e.target.value,
                                })
                            }
                            className={inputClasses}
                        />
                    </div>
                    <div className="relative">
                        <Scale className="absolute left-3 top-2.5 text-blue-400 w-5 h-5" />
                        <input
                            type="number"
                            placeholder="Gross Weight (g)"
                            onChange={(e) =>
                                setData("bottle", {
                                    ...data.bottle,
                                    gross_weight_g: e.target.value,
                                })
                            }
                            className={inputClasses}
                        />
                    </div>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 text-blue-400 w-5 h-5" />
                        <input
                            type="number"
                            placeholder="Bottle Selling Price"
                            onChange={(e) =>
                                setData("bottle", {
                                    ...data.bottle,
                                    bottle_selling_price: e.target.value,
                                })
                            }
                            className={inputClasses}
                        />
                    </div>
                </div>
            )}

            <button
                disabled={processing}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
                {processing ? (
                    <Loader2 className="animate-spin" />
                ) : (
                    <Save className="w-5 h-5" />
                )}
                {processing ? "Saving..." : "Save Product"}
            </button>
        </form>
    );
}
