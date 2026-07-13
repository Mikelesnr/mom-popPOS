import React, { useState, useMemo, useEffect } from "react";
import { usePage, router } from "@inertiajs/react";
import toast from "react-hot-toast";
import { db } from "@/Utils/db";

const AddStockForm = () => {
    const { props } = usePage();
    const shopId = props.auth?.user?.shop_id;

    const [catalogData, setCatalogData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedCategorySlug, setSelectedCategorySlug] = useState("all");
    const [processingIds, setProcessingIds] = useState(new Set());

    useEffect(() => {
        const fetchCatalog = async () => {
            if (!shopId) return;
            try {
                setLoading(true);
                const catalog = await db.catalogs.get(shopId);
                if (catalog) {
                    setCatalogData(catalog);
                } else {
                    toast.error("Local catalog data not found. Please sync.");
                }
            } catch (error) {
                console.error("Error fetching catalog from Dexie:", error);
                toast.error("Failed to load local data.");
            } finally {
                setLoading(false);
            }
        };
        fetchCatalog();
    }, [shopId]);

    const { categories, sortedProducts } = useMemo(() => {
        if (!catalogData || !catalogData.menu) {
            return { categories: [], sortedProducts: [] };
        }
        const categoryList = catalogData.menu.map((cat) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
        }));
        const allProducts = catalogData.menu.flatMap((category) =>
            category.products.map((product) => ({
                ...product,
                categoryName: category.name,
                categorySlug: category.slug,
            })),
        );
        const sortedList = allProducts.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        );
        return { categories: categoryList, sortedProducts: sortedList };
    }, [catalogData]);

    const filteredProducts = useMemo(() => {
        if (selectedCategorySlug === "all") {
            return sortedProducts;
        }
        return sortedProducts.filter(
            (p) => p.categorySlug === selectedCategorySlug,
        );
    }, [sortedProducts, selectedCategorySlug]);

    // --- UPDATED ROW COMPONENT ---
    const StockProductRow = ({ product }) => {
        const [addedQuantity, setAddedQuantity] = useState("");
        const isProcessing = processingIds.has(product.id);

        // Check if this is a spirit tracked by volume
        const isBottle = product.bottle_specs !== null;

        // Determine Display Units for Stock Level
        const displayStockUnit = isBottle ? "Shots" : "Units";

        // Determine Input Labels and Placeholders
        const inputUnitName = product.unit?.name || "Units";
        const inputLabel = isBottle
            ? "Add Quantity (Number of Bottles):"
            : `Add Quantity (Number of ${inputUnitName} added):`;
        const inputPlaceholder = "e.g., 1"; // Since we always add whole purchase units

        // Enforce integers for input (whole bottles or whole packs)
        const handleInputChange = (e) => {
            const val = e.target.value;
            if (val === "" || /^\d+$/.test(val)) {
                setAddedQuantity(val);
            }
        };

        const handleIndividualSubmit = (e) => {
            e.preventDefault();

            // Validate input is a positive integer
            const qty = parseInt(addedQuantity, 10);
            if (!qty || qty <= 0) {
                toast.error(
                    `Please enter a valid whole number quantity for ${product.name}.`,
                );
                return;
            }

            setProcessingIds((prev) => new Set(prev).add(product.id));

            router.put(
                route("stock.add-stock", product.id),
                {
                    added_quantity: qty, // Send integer count of items/bottles added
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        toast.success(`${product.name} stock updated.`);
                        setAddedQuantity("");
                    },
                    onError: () => {
                        toast.error(`Failed to update ${product.name} stock.`);
                    },
                    onFinish: () => {
                        setProcessingIds((prev) => {
                            const next = new Set(prev);
                            next.delete(product.id);
                            return next;
                        });
                    },
                },
            );
        };

        return (
            <article
                key={product.id}
                className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100 flex flex-col justify-between hover:shadow-xl transition-shadow duration-300"
            >
                <div className="mb-5">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                            {product.name}
                        </h3>
                        <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full uppercase tracking-wider whitespace-nowrap ml-2">
                            {product.categoryName}
                        </span>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 inline-block">
                        <p className="text-sm text-blue-900 font-medium">
                            Current QOH:
                        </p>
                        <p className="text-3xl font-bold text-blue-700">
                            {parseFloat(
                                product.stock?.quantity_on_hand || 0,
                            ).toLocaleString("en-US", {
                                // Force 0 decimal places for integer-based stock (shots or converted units)
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                            })}
                            <span className="text-lg ml-1.5 font-medium text-blue-600">
                                {/* Displays either "Shots" or "Units" */}
                                {displayStockUnit}
                            </span>
                        </p>
                        {isBottle && product.bottle_specs && (
                            <p className="text-xs text-blue-600 mt-1">
                                Bottle Volume:{" "}
                                {product.bottle_specs.capacity_ml}ml
                            </p>
                        )}
                    </div>
                </div>

                <form
                    onSubmit={handleIndividualSubmit}
                    className="mt-auto pt-4 border-t border-gray-100"
                >
                    <label
                        htmlFor={`stock-${product.id}`}
                        className="block text-sm font-medium text-gray-700 mb-2"
                    >
                        {inputLabel}
                    </label>
                    <div className="flex gap-3">
                        <input
                            id={`stock-${product.id}`}
                            type="text" // Use text to allow regex control
                            inputMode="numeric" // Show numeric keypad on mobile
                            value={addedQuantity}
                            onChange={handleInputChange}
                            placeholder={inputPlaceholder}
                            className="flex-grow block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg"
                            required
                            disabled={isProcessing}
                        />
                        <button
                            type="submit"
                            disabled={isProcessing}
                            className={`px-6 py-3 rounded-lg text-white font-semibold transition-all ${
                                isProcessing
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-green-600 hover:bg-green-700 shadow-sm hover:shadow"
                            }`}
                        >
                            {isProcessing ? "Updating..." : "Update"}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        {isBottle
                            ? `Enter the number of bottles added. System converts this to shots.`
                            : `Enter the number of ${inputUnitName} added.`}
                    </p>
                </form>
            </article>
        );
    };
    // --- END UPDATES ---

    if (loading) {
        return <div className="p-4 text-center">Loading catalog...</div>;
    }

    if (!catalogData || catalogData.menu.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500">
                No menu data available. Please ensure you have synced with the
                server.
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">
                    Add Stock (Intelligent Entry)
                </h1>
                <p className="text-gray-600">
                    Select a category and update stock. The system handles
                    conversion automatically.
                </p>
            </header>

            <section className="mb-8 sticky top-0 bg-gray-50 py-4 z-10 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3 tracking-wider">
                    Filter by Category
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 -mb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <button
                        onClick={() => setSelectedCategorySlug("all")}
                        className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                            selectedCategorySlug === "all"
                                ? "bg-blue-600 text-white shadow"
                                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                        }`}
                    >
                        All Items
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategorySlug(cat.slug)}
                            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                                selectedCategorySlug === cat.slug
                                    ? "bg-blue-600 text-white shadow"
                                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                    <StockProductRow key={product.id} product={product} />
                ))}
                {filteredProducts.length === 0 && (
                    <div className="col-span-full text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                vectorEffect="non-scaling-stroke"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 17a2 2 0 104 0m4 0a2 2 0 104 0m-6 10h.01M6 20h.01M8 20h.01M10 20h.01M12 20h.01M14 20h.01M16 20h.01M18 20h.01M3 3l1.5 9a9 9 0 0018 0L21 3M3 3h18M3 3v22.5M21 3v22.5M6 20h15M6 20v-3m0 3h.01M21 17v3m0 3h.01"
                            />
                        </svg>
                        <h3 className="mt-4 text-lg font-medium text-gray-900">
                            No products found
                        </h3>
                        <p className="mt-1 text-gray-500">
                            There are no products in the "
                            {categories.find(
                                (c) => c.slug === selectedCategorySlug,
                            )?.name || selectedCategorySlug}
                            " category.
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default AddStockForm;
