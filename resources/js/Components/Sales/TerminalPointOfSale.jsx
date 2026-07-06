import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import SearchAndTabs from "./Partials/SearchAndTabs";
import ProductGrid from "./Partials/ProductGrid";
import TicketCart from "./Partials/TicketCart";
import { saveCatalogLocal, getCatalogLocal } from "@/Utils/db";
import { Category, ShotSize, CartItem } from "@/Utils/contracts.js";

export default function TerminalPointOfSale() {
    const { auth } = usePage().props;
    const shopId = auth.user.shop_id;

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

    // TerminalPointOfSale_2.jsx snippet

    const addToCart = (product, selectionType, quantityOrShotSizeObj) => {
        setCart((currentCart) => {
            let cartItemId, price, displayName, quantityToDeduct, baseData;

            // --- LOGIC BRANCHES ---

            if (selectionType === "unit") {
                // Standard Retail Item (Coke, Beer)
                cartItemId = product.id;
                displayName = product.name;
                price = parseFloat(product.selling_price);
                quantityToDeduct = 1; // Simple unit deduction
                baseData = null;
            } else if (selectionType === "shot" && quantityOrShotSizeObj) {
                // Pre-configured Single/Double (shotSizeObj)
                const shotSize = quantityOrShotSizeObj;
                cartItemId = `${product.id}-shot-${shotSize.id}`;
                displayName = `${product.name} (${shotSize.name})`;

                // Price Calculation (Ratio + markup logic)
                const capacity = product.bottle?.capacity_ml || 750;
                const ratio = shotSize.size_ml / capacity;
                // Use base product price for shot calculation
                price = Number(
                    (parseFloat(product.selling_price) * ratio * 1.2).toFixed(
                        2,
                    ),
                );

                // Inventory Reduction Calculation
                quantityToDeduct = ratio; // e.g., 0.040
                baseData = { shot_size_id: shotSize.id, type: "shot" };
            } else if (
                selectionType === "custom_shots" &&
                typeof quantityOrShotSizeObj === "number"
            ) {
                // Cashier typed exact number of shots on keypad
                const numShots = quantityOrShotSizeObj;
                // Arbitrary ID to distinguish it from Single/Double buttons
                cartItemId = `${product.id}-custom-shots-${numShots}-${Date.now()}`;
                displayName = `${product.name} (${numShots} x Custom Shot)`;

                // Price Calculation: Multiply standard shot price by custom quantity
                // WARNING: This assumes a standard "single" price point for custom math.
                const defaultCapacity = product.bottle?.capacity_ml || 750;
                const defaultShotSizeML = 30; // Standardize default shot size for custom math
                const ratio = defaultShotSizeML / defaultCapacity;
                const unitShotPrice = Number(
                    (parseFloat(product.selling_price) * ratio * 1.2).toFixed(
                        2,
                    ),
                );
                price = unitShotPrice * numShots;

                // Inventory Reduction Calculation
                quantityToDeduct = ratio * numShots;
                baseData = { num_shots: numShots, type: "custom_shots" };
            } else if (selectionType === "bottle") {
                // Whole Bottle Button
                cartItemId = `${product.id}-bottle-full`;
                displayName = `${product.name} (Full Bottle)`;

                // PRICE OVERRIDE: Use the new bottle_selling_price, or fallback to product price
                price = product.bottle?.bottle_selling_price
                    ? parseFloat(product.bottle.bottle_selling_price)
                    : parseFloat(product.selling_price);

                // Inventory Reduction Calculation
                quantityToDeduct = 1.0; // Full deduction
                baseData = { type: "bottle" };
            }

            // --- CART IMMUTABILITY LOGIC (Shared) ---

            const existingIndex = currentCart.findIndex(
                (item) => item.cartId === cartItemId,
            );

            if (existingIndex > -1) {
                const updatedCart = [...currentCart];
                const item = updatedCart[existingIndex];

                // Update quantity
                item.quantity += quantityToDeduct;

                // Recalculate based on the per-unit price saved during initial add
                item.totalLinePrice = item.pricePerUnit * item.quantity;

                return updatedCart;
            }

            // Create new immutable cart item
            return [
                ...currentCart,
                {
                    cartId: cartItemId,
                    id: product.id, // product_id for backend
                    name: displayName,
                    pricePerUnit: price, // Store unit price
                    quantity: quantityToDeduct, // Store fractional inventory deduction
                    totalLinePrice: price, // Initial total price
                    baseData: baseData, // Store metadata for sync (e.g., { type: 'shot', size: 'single' })
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
            <TicketCart
                cart={cart}
                updateQuantity={updateQuantity}
                auth={auth}
            />
        </div>
    );
}
