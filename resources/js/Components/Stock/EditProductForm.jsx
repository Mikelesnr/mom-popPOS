//EditProductForm.jsx
import React, { useState } from "react";
import { useForm, usePage } from "@inertiajs/react";
import { useLiveQuery } from "dexie-react-hooks";
import toast from "react-hot-toast";
import { getCatalogLocal, db, syncInventoryLocal } from "@/Utils/db";
import {
    Package,
    Save,
    Loader2,
    X,
    Tag,
    ChevronRight,
    DollarSign,
    AlertTriangle,
    Ruler,
    Beaker,
    Weight,
    Scale,
} from "lucide-react";

export default function EditProductForm() {
    const { auth } = usePage().props;
    const [activeCategory, setActiveCategory] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Fetch data from local Dexie DB
    const catalogData = useLiveQuery(() =>
        getCatalogLocal(auth?.user?.shop_id),
    );
    const categories = catalogData?.menu || [];
    const units = useLiveQuery(() => db.units.toArray()) || [];

    // Get products for the currently active category
    const products =
        categories.find((c) => c.id === activeCategory)?.products || [];

    // Initialize form state using @inertiajs/react
    const { data, setData, put, processing, errors } = useForm(
        {
            id: "",
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
        },
        {
            // --- ADD THIS TRANSFORM HELPER ---
            // This cleans the data just before the PUT request is sent
            transform: (data) => ({
                ...data,
                // 1. Ensure numeric IDs are cast to strings for backend validation
                id: String(data.id),
                category_id:
                    data.category_id === "" ? null : String(data.category_id),
                unit_id: data.unit_id === "" ? null : String(data.unit_id),
                cost_price:
                    data.cost_price === "" ? null : String(data.cost_price),
                selling_price:
                    data.selling_price === ""
                        ? null
                        : String(data.selling_price),

                // 2. CRITICAL FIX: If it's NOT a bottle, unset or nullify the bottle data
                // so it passes backend validation rules (required_if).
                bottle: data.is_bottle
                    ? {
                          capacity_ml:
                              data.bottle.capacity_ml === ""
                                  ? null
                                  : Number(data.bottle.capacity_ml),
                          tare_weight_g:
                              data.bottle.tare_weight_g === ""
                                  ? null
                                  : Number(data.bottle.tare_weight_g),
                          gross_weight_g:
                              data.bottle.gross_weight_g === ""
                                  ? null
                                  : Number(data.bottle.gross_weight_g),
                          bottle_selling_price:
                              data.bottle.bottle_selling_price === ""
                                  ? null
                                  : Number(data.bottle.bottle_selling_price),
                      }
                    : null, // Sending null here allows the required_if rule to pass.
            }),
        },
    );

    // Filter units based on the is_bottle toggle
    const filteredUnits = data.is_bottle
        ? units
        : units.filter((u) => u.type === "unit");

    // Handle selecting a product from the list and populating the form
    const selectProduct = (product) => {
        setSelectedProduct(product);
        setData({
            id: product.id || "", // Ensure the ID is set in the form data
            name: product.name || "",
            category_id: product.category_id || "",
            unit_id: product.unit_id || "",
            cost_price: product.cost_price || "",
            selling_price: product.selling_price || "",
            is_perishable: !!product.is_perishable,
            is_bottle: !!product.is_bottle,
            bottle: product.bottle
                ? { ...product.bottle }
                : {
                      capacity_ml: "",
                      tare_weight_g: "",
                      gross_weight_g: "",
                      bottle_selling_price: "",
                  },
        });
    };

    // Handle form submission
    const submit = (e) => {
        e.preventDefault();

        // Note: Ensure your transform helper is configured in useForm to clean
        // empty strings and the nested bottle object before this request is sent.

        put(route("stock.update-product", data.id), {
            preserveScroll: true,
            // --- FIX: Handle Success with react-hot-toast ---
            onSuccess: async () => {
                // 1. Show success toast
                toast.success("Product updated successfully");

                // 2. Clear the form and reset selection
                reset();
                if (setSelectedProduct) {
                    setSelectedProduct(null); // Deselect from the list
                }

                // --- FIX: Sync Catalog Locally ---
                if (shopId) {
                    try {
                        console.log("🔄 Syncing catalog after update...");
                        await syncInventoryLocal(shopId);
                        console.log("✅ Catalog sync complete.");
                    } catch (syncErr) {
                        console.error(
                            "❌ Catalog sync failed after update:",
                            syncErr,
                        );
                        // Optional: toast.error("Failed to sync catalog data locally.");
                    }
                } else {
                    console.warn("⚠️ Shop ID not found, cannot sync catalog.");
                }
            },
            // --- FIX: Handle Error with react-hot-toast ---
            onError: (err) => {
                console.error("Submission error:", err);
                toast.error("Failed to update product. Please check the form.");
            },
        });
    };

    const inputClasses =
        "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";
    const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

    // --- Define the sections that are used within the main return block ---

    const renderCategorySelector = () => (
        <div>
            <label className={labelClasses}>Category</label>
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
            {errors.category_id && (
                <p className="text-red-500 text-xs mt-1">
                    {errors.category_id}
                </p>
            )}
        </div>
    );

    const renderUnitSelector = () => (
        <div>
            <label className={labelClasses}>Unit</label>
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
            {errors.unit_id && (
                <p className="text-red-500 text-xs mt-1">{errors.unit_id}</p>
            )}
        </div>
    );

    const renderPricingInputs = () => (
        <>
            <div>
                <label className={labelClasses}>Cost Price</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    <input
                        type="number"
                        step="0.01"
                        value={data.cost_price}
                        onChange={(e) => setData("cost_price", e.target.value)}
                        className={inputClasses}
                        placeholder="0.00"
                    />
                </div>
                {errors.cost_price && (
                    <p className="text-red-500 text-xs mt-1">
                        {errors.cost_price}
                    </p>
                )}
            </div>

            <div>
                <label className={labelClasses}>Selling Price</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    <input
                        type="number"
                        step="0.01"
                        value={data.selling_price}
                        onChange={(e) =>
                            setData("selling_price", e.target.value)
                        }
                        className={inputClasses}
                        placeholder="0.00"
                    />
                </div>
                {errors.selling_price && (
                    <p className="text-red-500 text-xs mt-1">
                        {errors.selling_price}
                    </p>
                )}
            </div>
        </>
    );

    const renderToggles = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
                <label className="flex items-center gap-3 text-gray-700 font-medium">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                    Is Perishable?
                </label>
                <input
                    type="checkbox"
                    checked={data.is_perishable}
                    onChange={(e) => setData("is_perishable", e.target.checked)}
                    className="w-6 h-6 text-blue-600 rounded cursor-pointer focus:ring-blue-500"
                />
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
                <label className="flex items-center gap-3 text-gray-700 font-medium">
                    <Beaker className="w-6 h-6 text-blue-500" />
                    Is this item a bottle?
                </label>
                <input
                    type="checkbox"
                    checked={data.is_bottle}
                    onChange={(e) => setData("is_bottle", e.target.checked)}
                    className="w-6 h-6 text-blue-600 rounded cursor-pointer focus:ring-blue-500"
                />
            </div>
        </div>
    );

    const renderBottleSpecs = () =>
        data.is_bottle && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border border-blue-100 bg-blue-50 rounded-2xl animate-in fade-in mt-6">
                <h4 className="col-span-2 text-lg font-bold text-blue-900 mb-2">
                    Bottle Specifications
                </h4>
                <div>
                    <label className={labelClasses}>Capacity (ml)</label>
                    <div className="relative">
                        <Beaker className="absolute left-3 top-2.5 text-blue-400 w-5 h-5" />
                        <input
                            type="number"
                            value={data.bottle.capacity_ml}
                            onChange={(e) =>
                                setData("bottle", {
                                    ...data.bottle,
                                    capacity_ml: e.target.value,
                                })
                            }
                            className={`${inputClasses} border-blue-200`}
                            placeholder="e.g. 750"
                        />
                    </div>
                    {errors["bottle.capacity_ml"] && (
                        <p className="text-red-500 text-xs mt-1">
                            {errors["bottle.capacity_ml"]}
                        </p>
                    )}
                </div>

                <div>
                    <label className={labelClasses}>
                        Tare Weight (g){" "}
                        <span className="text-gray-400">(Empty)</span>
                    </label>
                    <div className="relative">
                        <Weight className="absolute left-3 top-2.5 text-blue-400 w-5 h-5" />
                        <input
                            type="number"
                            value={data.bottle.tare_weight_g}
                            onChange={(e) =>
                                setData("bottle", {
                                    ...data.bottle,
                                    tare_weight_g: e.target.value,
                                })
                            }
                            className={`${inputClasses} border-blue-200`}
                            placeholder="e.g. 500"
                        />
                    </div>
                    {errors["bottle.tare_weight_g"] && (
                        <p className="text-red-500 text-xs mt-1">
                            {errors["bottle.tare_weight_g"]}
                        </p>
                    )}
                </div>

                <div>
                    <label className={labelClasses}>
                        Gross Weight (g){" "}
                        <span className="text-gray-400">(Full)</span>
                    </label>
                    <div className="relative">
                        <Scale className="absolute left-3 top-2.5 text-blue-400 w-5 h-5" />
                        <input
                            type="number"
                            value={data.bottle.gross_weight_g}
                            onChange={(e) =>
                                setData("bottle", {
                                    ...data.bottle,
                                    gross_weight_g: e.target.value,
                                })
                            }
                            className={`${inputClasses} border-blue-200`}
                            placeholder="e.g. 1250"
                        />
                    </div>
                    {errors["bottle.gross_weight_g"] && (
                        <p className="text-red-500 text-xs mt-1">
                            {errors["bottle.gross_weight_g"]}
                        </p>
                    )}
                </div>

                <div>
                    <label className={labelClasses}>Bottle Selling Price</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 text-blue-400 w-5 h-5" />
                        <input
                            type="number"
                            step="0.01"
                            value={data.bottle.bottle_selling_price}
                            onChange={(e) =>
                                setData("bottle", {
                                    ...data.bottle,
                                    bottle_selling_price: e.target.value,
                                })
                            }
                            className={`${inputClasses} border-blue-200`}
                            placeholder="0.00"
                        />
                    </div>
                    {errors["bottle.bottle_selling_price"] && (
                        <p className="text-red-500 text-xs mt-1">
                            {errors["bottle.bottle_selling_price"]}
                        </p>
                    )}
                </div>
            </div>
        );

    // --- Main Return Block ---

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
            {/* Left Pane: Navigation */}
            <div className="lg:col-span-1 space-y-4">
                <div className="bg-white p-4 rounded-xl shadow border">
                    <h3 className="font-bold mb-3 flex items-center gap-2 text-gray-800">
                        <Tag className="w-4 h-4 text-blue-600" /> Categories
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setActiveCategory(c.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeCategory === c.id ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow border h-[500px] overflow-y-auto">
                    <h3 className="font-bold mb-3 text-gray-800">Items</h3>
                    {products.length === 0 && activeCategory && (
                        <p className="text-gray-500 text-sm text-center mt-10">
                            No items found in this category.
                        </p>
                    )}
                    {products.length === 0 && !activeCategory && (
                        <p className="text-gray-500 text-sm text-center mt-10">
                            Select a category to view items.
                        </p>
                    )}
                    {products.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => selectProduct(p)}
                            className={`w-full flex justify-between items-center p-3 mb-2 rounded-lg transition-colors ${selectedProduct?.id === p.id ? "bg-blue-50 border border-blue-200" : "bg-slate-50 hover:bg-blue-50"}`}
                        >
                            <span className="font-medium text-gray-700">
                                {p.name}
                            </span>
                            <ChevronRight
                                className={`w-5 h-5 ${selectedProduct?.id === p.id ? "text-blue-600" : "text-gray-400"}`}
                            />
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Pane: Edit Form */}
            <div className="lg:col-span-2">
                <form
                    onSubmit={submit}
                    className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100"
                >
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                        <Package className="w-7 h-7 text-blue-600" />
                        Editing:{" "}
                        <span className="text-blue-800 truncate">
                            {selectedProduct?.name || "Select a product"}
                        </span>
                    </h2>

                    {!selectedProduct && (
                        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">
                                Please select a product from the list on the
                                left to edit its details.
                            </p>
                        </div>
                    )}

                    {selectedProduct && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Name */}
                                <div>
                                    <label className={labelClasses}>
                                        Product Name
                                    </label>
                                    <input
                                        value={data.name}
                                        onChange={(e) =>
                                            setData("name", e.target.value)
                                        }
                                        className={`${inputClasses} pl-4`}
                                        placeholder="Enter product name"
                                    />
                                    {errors.name && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>

                                {/* Category (Helper Component) */}
                                {renderCategorySelector()}

                                {/* Unit Selector (Helper Component) */}
                                {renderUnitSelector()}

                                {/* Pricing Inputs (Helper Component) */}
                                {renderPricingInputs()}
                            </div>

                            {/* Toggles (Helper Component) */}
                            {renderToggles()}

                            {/* Nested Bottle Fields (Helper Component) */}
                            {renderBottleSpecs()}

                            <button
                                disabled={processing}
                                className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                {processing ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                                {processing ? "Updating..." : "Update Product"}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
