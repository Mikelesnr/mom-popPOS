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
import { Category, ShotSize, CartItem } from "@/Utils/contracts.js";

export default function TerminalPointOfSale() {
    const { auth } = usePage().props;
    const shopId = auth.user.shop_id;
    const [showTables, setShowTables] = useState(false);
    const [activeTable, setActiveTable] = useState(null);

    /** @type {Category[]} */
    const [categories, setCategories] = useState([]);
    /** @type {ShotSize[]} */
    const [shotSizes, setShotSizes] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    /** @type {CartItem[]} */
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
            if (data.menu?.length > 0) setActiveCategory(data.menu[0].id);
        } catch (err) {
            console.error("Catalog Sync Error:", err);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleLoadTable = async (table) => {
        // Correctly pull order items where orderable_id matches the table id
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
            await syncInventoryLocal(); // Save inventory data locally after sync
            alert("Sync complete!");
        } catch (err) {
            console.error("Sync failed:", err);
            alert("Sync failed. Check your internet connection.");
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
                    setShotSizes(localData.shot_sizes || []);
                    if (localData.menu?.length > 0)
                        setActiveCategory(localData.menu[0].id);
                } else {
                    await refreshCatalogFromServer();
                }
            } catch (err) {
                console.error("IndexedDB initialization error:", err);
            }
        };
        loadTerminalData();
    }, [shopId]);

    /**
     * Unified AddToCart Method
     * This matches your OrderItem model structure (1:1).
     * No conversion logic needed here; backend handles calculations.
     */

    const addToCart = (product, metadata, quantity = 1) => {
        setCart((currentCart) => {
            // Adding Date.now() to the ID makes every single click unique
            const uniqueId = Date.now();
            const cartItemId = `${product.id}-${metadata.type}-${uniqueId}`;

            const price =
                metadata.type === "bottle"
                    ? product.bottle_specs?.bottle_selling_price ||
                      product.selling_price
                    : metadata.type === "double"
                      ? product.selling_price * 2
                      : product.selling_price;

            // No 'existingIndex' check needed—we always return a new item
            return [
                ...currentCart,
                {
                    cartItemId: cartItemId,
                    product_id: product.id,
                    name: product.name,
                    quantity: quantity,
                    unit_price: parseFloat(price),
                    subtotal: parseFloat(price) * quantity, // This is your total for the line
                    metadata: metadata,
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
        <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] gap-2 p-1 bg-slate-900 rounded-xl overflow-hidden">
            <div className="w-full md:w-3/4 flex flex-col p-2 bg-slate-800 space-y-2 h-full overflow-hidden">
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

            <div className="w-full md:w-1/3 flex flex-col gap-2">
                <TicketCart
                    cart={cart}
                    setCart={setCart}
                    auth={auth}
                    activeTable={activeTable}
                    setActiveTable={setActiveTable}
                />
                <button
                    onClick={() => setShowTables(true)}
                    className="w-full bg-amber-500 text-white font-bold py-2 rounded-lg hover:bg-amber-600"
                >
                    View My Tables
                </button>
            </div>

            <MyOpenTables
                auth={auth}
                isOpen={showTables}
                onClose={() => setShowTables(false)}
                onSelect={handleLoadTable}
            />
        </div>
    );
}
