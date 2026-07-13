import React, { useState } from "react";
import { useForm, usePage } from "@inertiajs/react";
import { useLiveQuery } from "dexie-react-hooks";
import { getCatalogLocal, db } from "@/Utils/db";
import {
    Package,
    Save,
    Loader2,
    X,
    Tag,
    ChevronRight,
    DollarSign,
    AlertTriangle,
} from "lucide-react";

export default function EditProductForm() {
    const { auth } = usePage().props;
    const [activeCategory, setActiveCategory] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const catalogData = useLiveQuery(() =>
        getCatalogLocal(auth?.user?.shop_id),
    );
    const categories = catalogData?.menu || [];
    const units = useLiveQuery(() => db.units.toArray()) || [];
    const products =
        categories.find((c) => c.id === activeCategory)?.products || [];

    const { data, setData, put, processing } = useForm({
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

    const selectProduct = (product) => {
        setSelectedProduct(product);
        setData({
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

    const submit = (e) => {
        e.preventDefault();
        put(route("stock.update-product", { id: selectedProduct.id }));
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
            {/* Left Pane: Navigation */}
            <div className="lg:col-span-1 space-y-4">
                <div className="bg-white p-4 rounded-xl shadow border">
                    <h3 className="font-bold mb-3 flex items-center gap-2">
                        <Tag className="w-4 h-4" /> Categories
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setActiveCategory(c.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${activeCategory === c.id ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow border h-[500px] overflow-y-auto">
                    <h3 className="font-bold mb-3">Items</h3>
                    {products.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => selectProduct(p)}
                            className="w-full flex justify-between items-center p-3 mb-2 bg-slate-50 hover:bg-blue-50 rounded-lg"
                        >
                            {p.name} <ChevronRight className="w-4 h-4" />
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Pane: Labeled, Complete Edit Form */}
            <div className="lg:col-span-2">
                <form
                    onSubmit={submit}
                    className="bg-white p-8 rounded-2xl shadow-xl border"
                >
                    <h2 className="text-xl font-bold mb-6">
                        Editing: {selectedProduct?.name || "Select a product"}
                    </h2>

                    {selectedProduct && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Inputs with Labels */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Product Name
                                </label>
                                <input
                                    value={data.name}
                                    onChange={(e) =>
                                        setData("name", e.target.value)
                                    }
                                    className="w-full p-3 border rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Category
                                </label>
                                <select
                                    value={data.category_id}
                                    onChange={(e) =>
                                        setData("category_id", e.target.value)
                                    }
                                    className="w-full p-3 border rounded-xl"
                                >
                                    <option value="">Select Category</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Unit
                                </label>
                                <select
                                    value={data.unit_id}
                                    onChange={(e) =>
                                        setData("unit_id", e.target.value)
                                    }
                                    className="w-full p-3 border rounded-xl"
                                >
                                    <option value="">Select Unit</option>
                                    {units.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Cost Price
                                </label>
                                <input
                                    type="number"
                                    value={data.cost_price}
                                    onChange={(e) =>
                                        setData("cost_price", e.target.value)
                                    }
                                    className="w-full p-3 border rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Selling Price
                                </label>
                                <input
                                    type="number"
                                    value={data.selling_price}
                                    onChange={(e) =>
                                        setData("selling_price", e.target.value)
                                    }
                                    className="w-full p-3 border rounded-xl"
                                />
                            </div>

                            <div className="flex items-center gap-2 mt-4">
                                <input
                                    type="checkbox"
                                    checked={data.is_perishable}
                                    onChange={(e) =>
                                        setData(
                                            "is_perishable",
                                            e.target.checked,
                                        )
                                    }
                                />
                                <label>Is Perishable?</label>
                            </div>

                            <div className="flex items-center gap-2 mt-4">
                                <input
                                    type="checkbox"
                                    checked={data.is_bottle}
                                    onChange={(e) =>
                                        setData("is_bottle", e.target.checked)
                                    }
                                />
                                <label>Is Bottle?</label>
                            </div>

                            {/* Nested Bottle Fields */}
                            {data.is_bottle && (
                                <div className="md:col-span-2 grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl mt-4">
                                    <label className="col-span-2 font-bold text-blue-800">
                                        Bottle Specifications
                                    </label>
                                    <input
                                        placeholder="Capacity (ml)"
                                        value={data.bottle.capacity_ml}
                                        onChange={(e) =>
                                            setData("bottle", {
                                                ...data.bottle,
                                                capacity_ml: e.target.value,
                                            })
                                        }
                                        className="p-2 border rounded"
                                    />
                                    <input
                                        placeholder="Tare Weight (g)"
                                        value={data.bottle.tare_weight_g}
                                        onChange={(e) =>
                                            setData("bottle", {
                                                ...data.bottle,
                                                tare_weight_g: e.target.value,
                                            })
                                        }
                                        className="p-2 border rounded"
                                    />
                                    <input
                                        placeholder="Gross Weight (g)"
                                        value={data.bottle.gross_weight_g}
                                        onChange={(e) =>
                                            setData("bottle", {
                                                ...data.bottle,
                                                gross_weight_g: e.target.value,
                                            })
                                        }
                                        className="p-2 border rounded"
                                    />
                                    <input
                                        placeholder="Bottle Selling Price"
                                        value={data.bottle.bottle_selling_price}
                                        onChange={(e) =>
                                            setData("bottle", {
                                                ...data.bottle,
                                                bottle_selling_price:
                                                    e.target.value,
                                            })
                                        }
                                        className="p-2 border rounded"
                                    />
                                </div>
                            )}

                            <button
                                disabled={processing}
                                className="md:col-span-2 w-full mt-8 bg-blue-600 text-white py-3 rounded-xl font-bold"
                            >
                                {processing ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    "Update Product"
                                )}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
