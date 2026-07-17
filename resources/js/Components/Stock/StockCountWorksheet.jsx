import React, { useState, useMemo } from "react";
import { usePage } from "@inertiajs/react";
import { useLiveQuery } from "dexie-react-hooks";
import toast from "react-hot-toast";
import {
    Search,
    RefreshCw,
    Loader2,
    ClipboardList,
    AlertTriangle,
    Package,
} from "lucide-react";

// Import sub-components
import StockCategoryGroup from "./StockCategoryGroup";

// Import Dexie utilities
import { db, getCatalogLocal, syncStockCountsToServer } from "@/Utils/db";
import PrimaryButton from "@/Components/PrimaryButton";

export default function StockCountWorksheet() {
    // 1. Get auth data to find active shop_id internally
    const { auth } = usePage().props;
    const shopId = auth?.user?.shop_id;

    // 2. INTERNAL DEXIE FETCH: Fetch catalog data directly within this component
    const dexie_catalogue = useLiveQuery(
        () => (shopId ? getCatalogLocal(shopId) : null),
        [shopId], // Re-fetch if shopId changes
    );

    // 3. Initialize UI State derived from the fetched Dexie data
    const [menu, setMenu] = useState(() => {
        if (!dexie_catalogue?.menu) return [];
        return mapCatalogToUiState(dexie_catalogue.menu);
    });

    // Sync state when the catalog actually loads from Dexie
    React.useEffect(() => {
        if (dexie_catalogue?.menu) {
            setMenu(mapCatalogToUiState(dexie_catalogue.menu));
        }
    }, [dexie_catalogue]);

    const [searchTerm, setSearchTerm] = useState("");
    const [expandedCategories, setExpandedCategories] = useState(
        () => dexie_catalogue?.menu?.map((cat) => cat.id) || [], // Initial expand all
    );
    const [isSyncing, setIsSyncing] = useState(false);

    // 4. LIVE QUERY: Watch Dexie for locked items (items pending sync)
    const pendingCounts = useLiveQuery(() => db.stock_counts.toArray(), []);

    // 5. Memoized Set of locked product IDs based on Dexie data
    const lockedProductIds = useMemo(() => {
        if (!pendingCounts) return new Set();
        return new Set(pendingCounts.map((c) => c.product_id));
    }, [pendingCounts]);

    // 6. Derived Statistics
    const stats = useMemo(() => {
        const totalProducts = menu.flatMap((cat) => cat.products).length;
        const pendingCount = pendingCounts ? pendingCounts.length : 0;

        return {
            pendingCounts: pendingCount,
            progressText:
                totalProducts > 0
                    ? `${pendingCount} / ${totalProducts} items counted`
                    : "No items to count",
            progressPercent:
                totalProducts > 0
                    ? Math.round((pendingCount / totalProducts) * 100)
                    : 0,
        };
    }, [menu, pendingCounts]);

    // 7. Filtered Menu (Search Logic & Sorting)
    const filteredMenu = useMemo(() => {
        if (!menu || menu.length === 0) return [];

        // A. Create a deep copy of the menu structure to avoid mutating original state
        const menuCopy = JSON.parse(JSON.stringify(menu));

        return (
            menuCopy
                .map((category) => {
                    // B. Sort products alphabetically (A-Z) within this category
                    if (category.products && category.products.length > 0) {
                        category.products.sort((a, b) =>
                            a.name.localeCompare(b.name, undefined, {
                                sensitivity: "base",
                            }),
                        );
                    }

                    // C. Apply search filter if a term exists
                    if (searchTerm) {
                        const lowerSearch = searchTerm.toLowerCase();
                        category.products = category.products.filter(
                            (p) =>
                                p.name.toLowerCase().includes(lowerSearch) ||
                                (p.sku &&
                                    p.sku.toLowerCase().includes(lowerSearch)),
                        );
                    }

                    return category;
                })
                // D. Remove categories that have no products (either originally empty or filtered out)
                .filter(
                    (category) =>
                        category.products && category.products.length > 0,
                )
        );
    }, [menu, searchTerm]);

    // --- HELPERS ---

    // Helper to transform raw menu data to include UI state trackers
    function mapCatalogToUiState(menuData) {
        return menuData.map((cat) => ({
            ...cat,
            products: cat.products.map((p) => ({
                ...p,
                // Internal UI tracker for inputs
                ui_state: { shots: null, each_count: null },
            })),
        }));
    }

    // --- EVENT HANDLERS ---

    const handleUpdateItemUiState = (itemId, newUiState) => {
        setMenu((prevMenu) =>
            prevMenu.map((cat) => ({
                ...cat,
                products: cat.products.map((p) => {
                    if (p.id === itemId) {
                        return { ...p, ui_state: newUiState };
                    }
                    return p;
                }),
            })),
        );
    };

    const toggleCategory = (categoryId) => {
        setExpandedCategories((prev) =>
            prev.includes(categoryId)
                ? prev.filter((id) => id !== categoryId)
                : [...prev, categoryId],
        );
    };

    // 9. Handle Sync to Server
    const handleSync = async () => {
        const pendingCount = stats.pendingCounts; // Assuming this matches your data source

        if (pendingCount === 0) {
            toast.error("No pending counts to sync.");
            return;
        }

        // Trigger confirmation toast
        toast(
            (t) => (
                <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium">
                        Sync {pendingCount} item counts to the server?
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={async () => {
                                toast.dismiss(t.id);
                                setIsSyncing(true);
                                try {
                                    await syncStockCountsToServer();
                                    toast.success(
                                        "Stock counts synced successfully.",
                                    );
                                } catch (err) {
                                    console.error("Sync error:", err);
                                    toast.error(
                                        "Sync failed. Counts are saved locally.",
                                    );
                                } finally {
                                    setIsSyncing(false);
                                }
                            }}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold"
                        >
                            Confirm Sync
                        </button>
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ),
            { duration: 5000 },
        );
    };
    // Get shop shot size
    const shopShotSizeMl = dexie_catalogue?.shot_sizes?.[0]?.size_ml || 0;

    // --- RENDER LOADING STATE ---

    if (!shopId) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                <p className="text-lg font-medium">
                    Identifying shop context...
                </p>
            </div>
        );
    }

    if (!dexie_catalogue) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                <p className="text-lg font-medium">
                    Loading catalog from local database...
                </p>
                <p className="text-sm text-gray-400 mt-1">
                    Ensure you have synced with the server recently.
                </p>
            </div>
        );
    }

    if (!dexie_catalogue.menu || dexie_catalogue.menu.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 p-6 text-center text-amber-600 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm">
                <AlertTriangle size={48} className="mb-4" />
                <p className="text-lg font-semibold">Catalog is empty.</p>
                <p className="text-base mt-1">
                    The local catalog exists but contains no categories or
                    products.
                </p>
                <p className="text-base">
                    Please perform a full sync with the server.
                </p>
            </div>
        );
    }

    // --- MAIN RENDER ---

    return (
        <div className="flex flex-col h-full bg-gray-50 rounded-2xl shadow-inner border border-gray-100 animate-in fade-in">
            {/* Header Section */}
            <div className="sticky top-0 bg-gray-50 z-10 p-4 border-b border-gray-200 rounded-t-2xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <ClipboardList className="w-8 h-8 text-blue-600" />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-950">
                                Stock Count Worksheet
                            </h2>
                            <p className="text-sm text-gray-500">
                                Shop: {dexie_catalogue.name}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* No onClose button needed here for ShopManager layout */}

                        <PrimaryButton
                            onClick={handleSync}
                            disabled={stats.pendingCounts === 0 || isSyncing}
                            className="bg-green-600 hover:bg-green-700 flex items-center gap-2 text-sm px-5 py-2.5 shadow"
                        >
                            {isSyncing ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <RefreshCw size={18} />
                            )}
                            Sync Ledger{" "}
                            {stats.pendingCounts > 0
                                ? `(${stats.pendingCounts})`
                                : ""}
                        </PrimaryButton>
                    </div>
                </div>

                {/* Search & Progress */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    {/* Update col-span-2 to md:col-span-2 */}
                    <div className="md:col-span-2 relative">
                        <Search
                            className="absolute left-3.5 top-2.5 text-gray-400"
                            size={20}
                        />
                        <input
                            type="text"
                            placeholder="Search by name or SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all text-sm"
                        />
                    </div>

                    {/* Progress bar container automatically stacks on mobile */}
                    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Sync Progress</span>
                            <span className="font-medium text-blue-700">
                                {stats.progressText}
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${stats.progressPercent}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Table Header Labels (Adjusted for 8/4 grid) */}
                <div className="grid grid-cols-12 gap-2 mt-5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-8">Item</div>
                    <div className="col-span-4 text-right">
                        Enter Count Below
                    </div>
                </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredMenu.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-60 text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <Package size={40} className="mb-3 text-gray-300" />
                        <p className="text-base font-medium">
                            No products match your search.
                        </p>
                        <p className="text-sm text-gray-400">
                            Try a different keyword or clear the search.
                        </p>
                    </div>
                )}

                {filteredMenu.map((category) => (
                    <StockCategoryGroup
                        key={category.id}
                        category={category}
                        onUpdateItemUiState={handleUpdateItemUiState}
                        shopShotSizeMl={shopShotSizeMl}
                        expanded={expandedCategories.includes(category.id)}
                        onToggle={toggleCategory}
                        lockedProductIds={lockedProductIds}
                    />
                ))}
                {/* Spacer for bottom scroll */}
                <div className="h-4"></div>
            </div>
        </div>
    );
}
