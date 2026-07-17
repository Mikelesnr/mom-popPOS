import React, { useState, useMemo, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import { useLiveQuery } from "dexie-react-hooks";
import toast from "react-hot-toast";
import {
    PackagePlus,
    Loader2,
    AlertTriangle,
    Search,
    RefreshCw,
} from "lucide-react";

// Import sub-components
import AddStockCategoryGroup from "./AddStockCategoryGroup";
import PrimaryButton from "@/Components/PrimaryButton";

// Import Dexie utilities (Ensure deleteStockAddLocal is exported from your db.js)
import {
    db,
    getCatalogLocal,
    syncStockAddsToServer,
    deleteStockAddLocal,
} from "@/Utils/db";

export default function AddStockWorksheet() {
    // 1. Get auth context to find active shop_id internally
    const { auth } = usePage().props;
    const shopId = auth?.user?.shop_id;

    // 2. INTERNAL DEXIE FETCH: Fetch catalog data directly within this component
    const dexie_catalogue = useLiveQuery(
        () => (shopId ? getCatalogLocal(shopId) : null),
        [shopId], // Re-fetch if shopId changes within the session
    );

    // --- INSTANT LOCKING MECHANISM (Mirroring StockCountWorksheet) ---

    // 3. INTERNAL DEXIE QUERY: Watch ALL pending adds globally from Dexie.
    // This query runs automatically whenever data is added or deleted from temp_stock_adds.
    const pendingAdds = useLiveQuery(
        () => db.temp_stock_adds.toArray(),
        [], // No dependencies needed, watches the whole table
    );

    // 4. Memoized Set of currently locked (queued) product IDs based on Dexie data.
    // This provides O(1) lookup performance during render.
    const lockedProductIds = useMemo(() => {
        if (!pendingAdds) return new Set();
        return new Set(pendingAdds.map((p) => p.product_id));
    }, [pendingAdds]);

    // -----------------------------------------------------------------

    // UI State
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedCategories, setExpandedCategories] = useState(
        () => dexie_catalogue?.menu?.map((cat) => cat.id) || [], // Initial expand all
    );
    const [isSyncing, setIsSyncing] = useState(false);

    // Sync state when the catalog actually loads from Dexie
    React.useEffect(() => {
        if (dexie_catalogue?.menu) {
            setExpandedCategories(dexie_catalogue.menu.map((cat) => cat.id));
        }
    }, [dexie_catalogue]);

    // 5. Memoized Catalog Processing (Sorting A-Z)
    const { categories, processedMenu } = useMemo(() => {
        if (!dexie_catalogue || !dexie_catalogue.menu) {
            return { categories: [], processedMenu: [] };
        }

        // Create deep copy and sort categories alphabetically
        const categoryList = dexie_catalogue.menu
            .map((cat) => ({
                id: cat.id,
                name: cat.name,
                slug: cat.slug,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        // Process menu: Sort products A-Z within categories
        const sortedAndProcessedMenu = categoryList.map((catInfo) => {
            const originalCat = dexie_catalogue.menu.find(
                (c) => c.id === catInfo.id,
            );

            const sortedProducts = [...(originalCat.products || [])].sort(
                (a, b) => a.name.localeCompare(b.name),
            );

            return {
                ...originalCat,
                products: sortedProducts.map((p) => ({
                    ...p,
                    // Ensure shop_id is attached to product object for db.js utilities if needed
                    shop_id: dexie_catalogue.shop_id,
                })),
            };
        });

        return {
            categories: categoryList,
            processedMenu: sortedAndProcessedMenu,
        };
    }, [dexie_catalogue]);

    // 6. Derived Statistics (Global Progress Bar)
    const stats = useMemo(() => {
        if (!processedMenu || processedMenu.length === 0) {
            return { total: 0, entered: 0, percent: 0, text: "0 items queued" };
        }
        const totalProducts = processedMenu.flatMap(
            (cat) => cat.products,
        ).length;
        // Use length of pendingAdds query result from Dexie
        const enteredCount = pendingAdds ? pendingAdds.length : 0;

        return {
            total: totalProducts,
            entered: enteredCount,
            percent:
                totalProducts > 0
                    ? Math.round((enteredCount / totalProducts) * 100)
                    : 0,
            text: `${enteredCount} / ${totalProducts} items queued`,
        };
    }, [processedMenu, pendingAdds]);

    // 7. Filtered Menu (Apply Search only)
    const filteredMenu = useMemo(() => {
        if (!processedMenu || processedMenu.length === 0) return [];

        if (!searchTerm) return processedMenu;

        const lowerSearch = searchTerm.toLowerCase();

        // Create deep copy to filter
        const menuCopy = JSON.parse(JSON.stringify(processedMenu));

        return menuCopy
            .map((category) => {
                category.products = category.products.filter(
                    (p) =>
                        p.name.toLowerCase().includes(lowerSearch) ||
                        (p.sku && p.sku.toLowerCase().includes(lowerSearch)),
                );
                return category;
            })
            .filter((category) => category.products.length > 0);
    }, [processedMenu, searchTerm]);

    // --- EVENT HANDLERS ---

    const toggleCategory = (categoryId) => {
        setExpandedCategories((prev) =>
            prev.includes(categoryId)
                ? prev.filter((id) => id !== categoryId)
                : [...prev, categoryId],
        );
    };

    // --- INSTANT LOCKING/UNLOCKING HANDLER ---
    // This function is passed down to AddStockInput via props.
    const handleStockQueued = async (productId, isNowQueued) => {
        if (!isNowQueued) {
            // User clicked the 'X' icon inside AddStockInput to unlock/cancel
            try {
                // Delete directly from Dexie. useLiveQuery will auto-update the UI.
                await deleteStockAddLocal(productId);
                toast.success("Item unlocked");
            } catch (err) {
                console.error("Error unlocking stock add:", err);
                toast.error("Failed to unlock item.");
            }
        }
        // If isNowQueued is true (saved via Input), useLiveQuery handles the UI lock automatically.
    };
    // ------------------------------------------

    const handleSync = async () => {
        const pendingCount = pendingAdds ? pendingAdds.length : 0;
        if (pendingCount === 0) {
            toast.error("No pending items to sync.");
            return;
        }

        // Trigger a toast with custom actions
        toast(
            (t) => (
                <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium">
                        Sync {pendingCount} items to the server?
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={async () => {
                                toast.dismiss(t.id);
                                setIsSyncing(true);
                                try {
                                    await syncStockAddsToServer(shopId);
                                    toast.success(
                                        "Stock additions synced successfully.",
                                    );
                                } catch (err) {
                                    console.error("Sync error:", err);
                                    toast.error(
                                        "Sync failed. Items remain local.",
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
    // --- RENDER LOADING/ERROR STATES ---

    if (!shopId) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                <p className="text-lg font-medium">
                    Identifying shop context...
                </p>
            </div>
        );
    }

    if (!dexie_catalogue) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                <p className="text-lg font-medium">
                    Loading catalog from local database...
                </p>
                <p className="text-sm text-gray-400 mt-1">
                    Ensure you have synced recently.
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
            {/* Header & Controls (Stays fixed at top) */}
            <div className="sticky top-0 bg-gray-50 z-10 p-4 border-b border-gray-200 rounded-t-2xl">
                <header className="mb-4 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-950 flex items-center gap-3">
                            <PackagePlus className="w-7 h-7 text-green-600" />
                            Smart Stock Entry
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Add inventory quantities. Sync when finished.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-gray-500 bg-white px-3.5 py-1.5 rounded-full shadow-sm border border-gray-100">
                            Shop: {dexie_catalogue.name}
                        </div>

                        <PrimaryButton
                            onClick={handleSync}
                            disabled={
                                !pendingAdds ||
                                pendingAdds.length === 0 ||
                                isSyncing
                            }
                            className="bg-green-600 hover:bg-green-700 flex items-center gap-2 text-sm px-5 py-2.5 shadow disabled:opacity-60"
                        >
                            {isSyncing ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <RefreshCw size={18} />
                            )}
                            Sync Ledger{" "}
                            {pendingAdds && pendingAdds.length > 0
                                ? `(${pendingAdds.length})`
                                : ""}
                        </PrimaryButton>
                    </div>
                </header>

                {/* Search & Progress Bar Area */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mt-4">
                    <div className="md:col-span-2 relative">
                        <Search
                            className="absolute left-3.5 top-3 text-gray-400"
                            size={20}
                        />
                        <input
                            type="text"
                            placeholder="Search products by name or SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all text-sm bg-white shadow-sm"
                        />
                    </div>

                    {/* Global Progress Bar (Copied from StockCountWorksheet) */}
                    <div className="col-span-1 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                            <span className="font-medium">Entry Progress</span>
                            <span className="font-bold text-green-700">
                                {stats.text}
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden border border-gray-200">
                            <div
                                className="bg-green-500 h-full rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${stats.percent}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Table Header Labels */}
                <div className="grid grid-cols-12 gap-2 mt-5 px-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-7">Item</div>
                    <div className="col-span-5 text-right">
                        In Stock / Add Qty
                    </div>
                </div>
            </div>

            {/* Scrollable Product List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-gray-50/50 rounded-b-2xl">
                {filteredMenu.length === 0 && (
                    <div className="text-center py-16 px-6 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm m-2">
                        <AlertTriangle
                            size={40}
                            className="mx-auto text-amber-400 mb-3"
                        />
                        <p className="text-base font-medium">
                            No products match your search.
                        </p>
                        <p className="text-sm mt-1 text-gray-400">
                            Try a different keyword or clear the search.
                        </p>
                    </div>
                )}
                {filteredMenu.map((category) => (
                    <AddStockCategoryGroup
                        key={category.id}
                        category={category}
                        expanded={expandedCategories.includes(category.id)}
                        onToggle={toggleCategory}
                        // --- PASS DEXIE-DERIVED PROPS DOWN ---
                        lockedProductIds={lockedProductIds}
                        onStockQueued={handleStockQueued} // Pass unlock handler down
                    />
                ))}
                <div className="h-4"></div> {/* Bottom spacer */}
            </div>
        </div>
    );
}
