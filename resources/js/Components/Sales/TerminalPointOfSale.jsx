import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import { useSwipeable } from "react-swipeable";
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
    const [activeView, setActiveView] = useState("products");

    const [categories, setCategories] = useState([]);
    const [shotSizes, setShotSizes] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [cart, setCart] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);

    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => activeView === "products" && setActiveView("cart"),
        onSwipedRight: () => activeView === "cart" && setActiveView("products"),
        preventScrollOnSwipe: true,
    });

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
        const items = await db.order_items
            .where("orderable_id")
            .equals(table.id)
            .toArray();
        const cartItems = items.map((item) => ({
            cartItemId: item.id,
            product_id: item.product_id,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            metadata: item.metadata,
            placed: item.placed,
        }));
        setCart(cartItems);
        setActiveTable(table);
        setActiveView("cart");
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
    }, [shopId, activeCategory]);

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
                    cartItemId,
                    product_id: product.id,
                    name: product.name,
                    quantity,
                    unit_price: parseFloat(price),
                    subtotal: parseFloat(price) * quantity,
                    metadata,
                    placed: 0,
                    orderable_id: null,
                    orderable_type: null,
                },
            ];
        });
        if (window.innerWidth < 768) setActiveView("cart");
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
        <div className="h-screen flex flex-col bg-slate-950 overflow-hidden font-sans antialiased">
            {/* Desktop View */}
            <div className="hidden md:flex h-full gap-3 p-3">
                <div className="w-3/4 flex flex-col p-3 bg-slate-900 rounded-xl shadow-inner">
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
                <div className="w-1/4 flex flex-col gap-3">
                    <div className="flex-1 overflow-hidden rounded-xl shadow-lg bg-white">
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
                        className="w-full bg-amber-500 py-3 rounded-xl font-bold"
                    >
                        View My Open Tables
                    </button>
                </div>
            </div>

            {/* Mobile Swipeable View */}
            <div
                {...swipeHandlers}
                className="md:hidden flex-1 flex flex-col overflow-hidden"
            >
                <div className="flex-1 overflow-hidden">
                    {activeView === "products" ? (
                        <div className="h-full overflow-y-auto p-2 bg-slate-900">
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
                    ) : (
                        <div className="h-full overflow-y-auto p-2 bg-white">
                            <TicketCart
                                cart={cart}
                                setCart={setCart}
                                auth={auth}
                                activeTable={activeTable}
                                setActiveTable={setActiveTable}
                            />
                            <button
                                onClick={() => setShowTables(true)}
                                className="w-full bg-amber-500 py-4 mt-2 rounded-xl font-bold"
                            >
                                View Open Tables
                            </button>
                        </div>
                    )}
                </div>
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
