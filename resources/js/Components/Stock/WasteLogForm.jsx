import React, { useState, useMemo } from "react";
import { useForm, usePage } from "@inertiajs/react";
import { useLiveQuery } from "dexie-react-hooks";
import toast from "react-hot-toast";
import { getCatalogLocal } from "@/Utils/db"; // Ensure this utility exists
import {
    Trash2,
    Save,
    Loader2,
    Tag,
    ChevronRight,
    AlertTriangle,
    FileText,
    Package,
    Wine,
    Hash,
} from "lucide-react";

export default function WasteLogForm() {
    const { auth } = usePage().props;
    const [activeCategory, setActiveCategory] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Fetch data from local Dexie DB (identical to EditProductForm)
    const catalogData = useLiveQuery(() =>
        getCatalogLocal(auth?.user?.shop_id),
    );
    const categories = catalogData?.menu || [];

    // Get products for the currently active category
    const products = useMemo(() => {
        if (!activeCategory || !categories.length) return [];
        const category = categories.find((c) => c.id === activeCategory);
        return category ? category.products : [];
    }, [activeCategory, categories]);

    // Initialize form state using @inertiajs/react
    // Note: 'metadata' maps to 'stock_type' in the UI (unit, shot, or bottle)
    const { data, setData, post, processing, errors, reset } = useForm({
        product_id: "",
        quantity: "",
        reason: "",
        metadata: "unit", // Default to unit
    });

    // Handle selecting a product from the list
    const selectProduct = (product) => {
        setSelectedProduct(product);
        setData((prev) => ({
            ...prev,
            product_id: product.id,
            // Default metadata based on whether it's a bottle-tracked item
            metadata: product.bottle_specs ? "bottle" : "unit",
        }));
    };

    // Determine if selected product is tracked by volume (is a spirit)
    // Note: Checking existence of bottle_specs
    const isSpirit = selectedProduct?.bottle_specs !== null;

    // Define available stock types based on product category
    const stockTypeOptions = useMemo(() => {
        if (isSpirit) {
            return [
                { value: "shot", label: "Shots" },
                { value: "bottle", label: "Full Bottle" },
            ];
        }
        return [{ value: "unit", label: "Units" }];
    }, [isSpirit]);

    // Handle form submission
    const submit = (e) => {
        e.preventDefault();

        if (!selectedProduct) {
            toast.error("Please select a product to waste.");
            return;
        }

        post(route("stock.waste.store"), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Waste logged successfully");
                reset(); // Clear the form
                setSelectedProduct(null); // Deselect product
            },
            onError: () => {
                toast.error(
                    "Failed to log waste. Please check the form errors.",
                );
                // Inertia automatically populates the 'errors' object
            },
        });
    };

    const inputClasses =
        "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all";
    const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
            {/* Left Pane: Navigation (Identical structure to EditProductForm) */}
            <div className="lg:col-span-1 space-y-4">
                <div className="bg-white p-4 rounded-xl shadow border">
                    <h3 className="font-bold mb-3 flex items-center gap-2 text-gray-800">
                        <Tag className="w-4 h-4 text-blue-600" /> Categories
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((c) => (
                            <button
                                key={c.id}
                                type="button" // Important to prevent form submission
                                onClick={() => setActiveCategory(c.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                                    activeCategory === c.id
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                }`}
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
                            type="button"
                            onClick={() => selectProduct(p)}
                            className={`w-full flex justify-between items-center p-3 mb-2 rounded-lg transition-colors ${
                                selectedProduct?.id === p.id
                                    ? "bg-blue-50 border border-blue-200"
                                    : "bg-slate-50 hover:bg-blue-50"
                            }`}
                        >
                            <span className="font-medium text-gray-700">
                                {p.name}
                            </span>
                            <ChevronRight
                                className={`w-5 h-5 ${
                                    selectedProduct?.id === p.id
                                        ? "text-blue-600"
                                        : "text-gray-400"
                                }`}
                            />
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Pane: Waste Log Form */}
            <div className="lg:col-span-2">
                <form
                    onSubmit={submit}
                    className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100"
                >
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                        <Trash2 className="w-7 h-7 text-red-500" />
                        Log Stock Waste
                    </h2>

                    {!selectedProduct && (
                        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">
                                Please select a product from the list on the
                                left to log it as waste.
                            </p>
                        </div>
                    )}

                    {selectedProduct && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                                <span className="text-gray-600 font-medium">
                                    Selected Item:
                                </span>
                                <span className="text-lg font-bold text-blue-900">
                                    {selectedProduct.name}
                                </span>
                            </div>

                            {/* Quantity */}
                            <div>
                                <label
                                    htmlFor="quantity"
                                    className={labelClasses}
                                >
                                    Quantity to Waste
                                </label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                                    <input
                                        id="quantity"
                                        type="number"
                                        step="0.001"
                                        min="0.001"
                                        value={data.quantity}
                                        onChange={(e) =>
                                            setData("quantity", e.target.value)
                                        }
                                        className={inputClasses}
                                        placeholder="e.g. 1.000"
                                        required
                                    />
                                </div>
                                {errors.quantity && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.quantity}
                                    </p>
                                )}
                            </div>

                            {/* Stock Type (Metadata) - Conditional Dropdown */}
                            <div>
                                <label
                                    htmlFor="metadata"
                                    className={labelClasses}
                                >
                                    Stock Type (How is it measured?)
                                </label>
                                <div className="relative">
                                    {isSpirit ? (
                                        <Wine className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                                    ) : (
                                        <Package className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                                    )}
                                    <select
                                        id="metadata"
                                        value={data.metadata}
                                        onChange={(e) =>
                                            setData("metadata", e.target.value)
                                        }
                                        className={inputClasses}
                                        required
                                    >
                                        {stockTypeOptions.map((option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {isSpirit
                                        ? "Select 'Shots' if wasting partial liquor, or 'Full Bottle' for an entire bottle."
                                        : `This item is tracked by unit. Enter the count of items wasted.`}
                                </p>
                            </div>

                            {/* Reason */}
                            <div>
                                <label
                                    htmlFor="reason"
                                    className={labelClasses}
                                >
                                    Reason for Waste
                                </label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                                    <textarea
                                        id="reason"
                                        value={data.reason}
                                        onChange={(e) =>
                                            setData("reason", e.target.value)
                                        }
                                        className={`${inputClasses} h-24 resize-none`}
                                        placeholder="e.g. Spilled, Expired, Broken..."
                                        required
                                    />
                                </div>
                                {errors.reason && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.reason}
                                    </p>
                                )}
                            </div>

                            {/* Hazard Warning if Perishable */}
                            {selectedProduct.is_perishable && (
                                <div className="flex items-center gap-3 p-4 border border-amber-200 rounded-xl bg-amber-50 text-amber-900">
                                    <AlertTriangle className="w-10 h-10 text-amber-500 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold">
                                            Perishable Item
                                        </p>
                                        <p className="text-sm">
                                            This item is marked as perishable.
                                            Please double-check that it has
                                            actually expired before wasting.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:bg-gray-400"
                            >
                                {processing ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                                {processing
                                    ? "Logging Waste..."
                                    : "Confirm Waste and Deduct Stock"}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
