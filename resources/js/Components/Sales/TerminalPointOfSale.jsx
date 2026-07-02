import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import SearchAndTabs from "./Partials/SearchAndTabs";
import ProductGrid from "./Partials/ProductGrid";
import TicketCart from "./Partials/TicketCart";
import { saveCatalogLocal, getCatalogLocal } from "@/Utils/db";

export default function TerminalPointOfSale() {
    const { auth } = usePage().props;
    const shopId = auth.user.shop_id;

    const [categories, setCategories] = useState([]);
    const [shotSizes, setShotSizes] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [cart, setCart] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);

    // Color array to index category buttons dynamically
    const colorPalette = [
        "bg-blue-600 hover:bg-blue-700 text-white",
        "bg-amber-600 hover:bg-amber-700 text-white",
        "bg-emerald-600 hover:bg-emerald-700 text-white",
        "bg-rose-600 hover:bg-rose-700 text-white",
        "bg-purple-600 hover:bg-purple-700 text-white",
        "bg-cyan-600 hover:bg-cyan-700 text-white",
        "bg-orange-600 hover:bg-orange-700 text-white font-bold",
    ];

    // Fetch master menu dataset from server and dump to IndexedDB
    const refreshCatalogFromServer = async () => {
        setIsSyncing(true);
        try {
            const response = await fetch("/inventory/sync-catalog");
            if (!response.ok) throw new Error("Network catalog fetch failed");
            const data = await response.json();

            // 🔍 Debug log: see what categories/products are coming back
            console.log("Catalog response:", data);

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

    // On component mount: try loading from local IndexedDB storage first
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
                    // Fallback to fetch immediately if DB is empty
                    await refreshCatalogFromServer();
                }
            } catch (err) {
                console.error("IndexedDB initialization error:", err);
            }
        };
        loadTerminalData();
    }, [shopId]);

    const addToCart = (product, isShot = false, shotSizeObj = null) => {
        setCart((currentCart) => {
            const cartItemId = isShot
                ? `${product.id}-shot-${shotSizeObj.id}`
                : product.id;
            const existingIndex = currentCart.findIndex(
                (item) => item.cartId === cartItemId,
            );
            let price = parseFloat(product.selling_price);
            let displayName = product.name;

            if (isShot && shotSizeObj) {
                const capacity = product.bottle?.capacity_ml || 750;
                const ratio = shotSizeObj.size_ml / capacity;
                price = Number(
                    (parseFloat(product.selling_price) * ratio * 1.2).toFixed(
                        2,
                    ),
                );
                displayName = `${product.name} (${shotSizeObj.name})`;
            }

            if (existingIndex > -1) {
                const updatedCart = [...currentCart];
                updatedCart[existingIndex].quantity += 1;
                return updatedCart;
            }

            return [
                ...currentCart,
                {
                    cartId: cartItemId,
                    id: product.id,
                    name: displayName,
                    price: price,
                    quantity: 1,
                },
            ];
        });
    };

    const updateQuantity = (cartId, amount) => {
        setCart((currentCart) =>
            currentCart
                .map((item) =>
                    item.cartId === cartId
                        ? { ...item, quantity: item.quantity + amount }
                        : item,
                )
                .filter((item) => item.quantity > 0),
        );
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
            {/* Left Touch-Input Container */}
            <div className="w-full md:w-3/4 flex flex-col p-2 bg-slate-800 space-y-2 h-full overflow-hidden">
                <SearchAndTabs
                    categories={categories}
                    activeCategory={activeCategory}
                    setActiveCategory={setActiveCategory}
                    colorPalette={colorPalette}
                    refreshCatalog={refreshCatalogFromServer}
                    isSyncing={isSyncing}
                />
                <ProductGrid
                    filteredProducts={filteredProducts}
                    shotSizes={shotSizes}
                    addToCart={addToCart}
                    activeColorClass={activeColorClass}
                />
            </div>

            {/* Right Open Ticket View Panel */}
            <TicketCart
                cart={cart}
                updateQuantity={updateQuantity}
                auth={auth}
            />
        </div>
    );
}
