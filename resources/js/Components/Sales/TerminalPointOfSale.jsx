import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import SearchAndTabs from "./Partials/SearchAndTabs";
import ProductGrid from "./Partials/ProductGrid";
import TicketCart from "./Partials/TicketCart";
import MyOpenTables from "./Partials/MyOpenTables";
import {
    db,
    saveCatalogLocal,
    getCatalogLocal,
    syncOrdersToServer,
    syncTablesToServer,
    syncInventoryLocal,
} from "@/Utils/db";
import toast from "react-hot-toast";

export default function TerminalPointOfSale() {
    const { auth } = usePage().props;
    const shopId = auth.user.shop_id;
    const [showTables, setShowTables] = useState(false);
    const [activeTable, setActiveTable] = useState(null);

    const [categories, setCategories] = useState([]);
    const [shotSizes, setShotSizes] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [cart, setCart] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);

    const colorPalette = [
        "bg-blue-600 hover:bg-blue-700 text-white",
        "bg-amber-600 hover:bg-amber-700 text-white",
        "bg-emerald-600 hover:bg-emerald-700 text-white",
        "bg-rose-600 hover:bg-rose-700 text-white",
        "bg-purple-600 hover:bg-purple-700 text-white",
        "bg-cyan-600 hover:bg-cyan-700 text-white",
        "bg-orange-600 hover:bg-orange-700 text-white font-bold",
    ];

    const refreshCatalogFromServer = async () => {
        setIsSyncing(true);
        try {
            const response = await fetch("/inventory/sync-catalog");
            if (!response.ok) throw new Error("Network catalog fetch failed");
            const data = await response.json();

            await saveCatalogLocal(shopId, {
                menu: data.menu,
                shot_sizes: data.shot_sizes,
            });

            setCategories(data.menu || []);
            setShotSizes(data.shot_sizes || []);
            if (data.menu?.length > 0 && !activeCategory)
                setActiveCategory(data.menu[0].id);
        } catch (err) {
            console.error("Catalog Sync Error:", err);
            toast.error("Failed to sync catalog from server.");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleLoadTable = async (table) => {
        // Pull order items linked to this table
        const items = await db.order_items
            .where("orderable_id")
            .equals(table.id)
            .toArray();

        const cartItems = items.map((item) => ({
            cartItemId: item.id, // Keep ID consistent for updates
            product_id: item.product_id,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            metadata: item.metadata,
            placed: item.placed, // Ensure placed flag is carried over
        }));

        setCart(cartItems);
        setActiveTable(table);
    };

    const performFullSync = async () => {
        setIsSyncing(true);
        try {
            await syncOrdersToServer();
            await syncTablesToServer();
            await refreshCatalogFromServer();
            await syncInventoryLocal();
            toast.success("Sync complete!");
        } catch (err) {
            console.error("Sync failed:", err);
            toast.error("Sync failed. Check your internet connection.");
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        const loadTerminalData = async () => {
            try {
                const localData = await getCatalogLocal(shopId);
                if (localData) {
                    setCategories(localData.menu || []);
                    // FIX: Use localData.shot_sizes instead of data.shot_sizes
                    setShotSizes(localData.shot_sizes || []);
                    if (localData.menu?.length > 0 && !activeCategory)
                        setActiveCategory(localData.menu[0].id);
                } else {
                    await refreshCatalogFromServer();
                }
            } catch (err) {
                console.error("IndexedDB initialization error:", err);
                toast.error("Failed to load local data.");
            }
        };
        loadTerminalData();
    }, [shopId, activeCategory]); // Added activeCategory to dependencies

    const addToCart = (product, metadata, quantity = 1) => {
        setCart((currentCart) => {
            const uniqueId = Date.now();
            const cartItemId = `${product.id}-${metadata.type}-${uniqueId}`;

            const price =
                metadata.type === "bottle"
                    ? product.bottle_specs?.bottle_selling_price ||
                      product.selling_price
                    : metadata.type === "double"
                      ? product.selling_price * 2
                      : product.selling_price;

            return [
                ...currentCart,
                {
                    cartItemId: cartItemId,
                    product_id: product.id,
                    name: product.name,
                    quantity: quantity,
                    unit_price: parseFloat(price),
                    subtotal: parseFloat(price) * quantity,
                    metadata: metadata,
                    placed: 0, // New items start as unplaced (in JS state only)
                    orderable_id: null,
                    orderable_type: null,
                },
            ];
        });
    };

    const activeCategoryData = categories.find((c) => c.id === activeCategory);
    const filteredProducts = activeCategoryData?.products || [];
    const activeCategoryIndex = categories.findIndex(
        (c) => c.id === activeCategory,
    );
    const activeColorClass =
        colorPalette[activeCategoryIndex % colorPalette.length] ||
        "bg-gray-600 text-white";

    return (
        // Responsive height calculation (viewport minus header) and layout stacking
        <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] gap-3 p-2 md:p-3 bg-slate-950 md:rounded-xl overflow-hidden font-sans antialiased">
            {/* Left Panel: Categories & Products (Flex 3 on md+, full width on mobile) */}
            <div className="w-full md:w-3/4 flex flex-col p-3 bg-slate-900 space-y-3 h-full overflow-hidden rounded-2xl md:rounded-xl md:rounded-r-none shadow-inner">
                <SearchAndTabs
                    categories={categories}
                    activeCategory={activeCategory}
                    setActiveCategory={setActiveCategory}
                    colorPalette={colorPalette}
                    refreshCatalog={performFullSync}
                    isSyncing={isSyncing}
                />
                <ProductGrid
                    filteredProducts={filteredProducts}
                    shotSizes={shotSizes}
                    addToCart={addToCart}
                    activeColorClass={activeColorClass}
                />
            </div>

            {/* Right Panel: Cart & Actions (Flex 1 on md+, full width on mobile, sits below products on mobile) */}
            <div className="w-full md:w-1/4 flex flex-col gap-3 h-[45vh] md:h-full min-h-[250px] md:min-h-0 order-first md:order-last">
                <div className="flex-1 overflow-hidden rounded-2xl md:rounded-xl shadow-lg bg-white">
                    <TicketCart
                        cart={cart}
                        setCart={setCart}
                        auth={auth}
                        activeTable={activeTable}
                        setActiveTable={setActiveTable}
                    />
                </div>
                <button
                    onClick={() => setShowTables(true)}
                    className="w-full bg-amber-500 text-slate-950 font-bold py-4 md:py-3.5 rounded-xl hover:bg-amber-400 transition duration-150 shadow text-base md:text-sm active:scale-[0.98]"
                >
                    View My Open Tables
                </button>
            </div>

            {/* Tables Modal */}
            <MyOpenTables
                auth={auth}
                isOpen={showTables}
                onClose={() => setShowTables(false)}
                onSelect={handleLoadTable}
            />
        </div>
    );
}
