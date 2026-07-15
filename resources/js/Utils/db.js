import Dexie from "dexie";

// Initialize the database
export const db = new Dexie("MomnPopPWA");

/**
 * VERSION 6 SCHEMA
 * 1. Added 'metadata.type' index to order_items for fast report generation.
 * 2. Standardized indexes across all stores.
 */
db.version(8).stores({
    catalogs: "shop_id",
    orders: "id, shift_id, user_id, status, created_at, synced_at",
    open_tables: "id, shift_id, user_id, status, created_at, synced_at",
    order_items: "id, orderable_id, product_id, synced_at, metadata",
    categories: "id, shop_id, name",
    units: "id, name, type",
    stock_counts: "product_id, quantity_total_base_units, created_at",
    temp_stock_adds: "id, product_id, added_quantity, shop_id, added_at",
});

/**
 * CATALOG HELPERS
 */
export const saveCatalogLocal = async (shopId, data) => {
    return await db.catalogs.put({
        shop_id: shopId,
        ...data,
        synced_at: data.synced_at || new Date().toISOString(),
    });
};

export const getCatalogLocal = async (shopId) => {
    return await db.catalogs.get(shopId);
};

/**
 * ORDER & TABLE HELPERS
 */
export const saveOrderLocal = async (orderData) => {
    return await db.orders.put({
        ...orderData,
        synced_at: orderData.synced_at || null,
        created_at: orderData.created_at || new Date().toISOString(),
    });
};

export const saveTableLocal = async (tableData) => {
    return await db.open_tables.put({
        ...tableData,
        synced_at: tableData.synced_at || null,
        created_at: tableData.created_at || new Date().toISOString(),
    });
};

/**
 * ORDER ITEM HELPER
 * Ensures metadata is saved as a structured object, not a string.
 */
export const saveOrderItemLocal = async (itemData) => {
    return await db.order_items.put({
        ...itemData,
        // Ensure metadata is always an object, fallback to 'unit'
        metadata:
            itemData.metadata && typeof itemData.metadata === "object"
                ? itemData.metadata
                : { type: "unit" },
        synced_at: null,
    });
};

/**
 * Helper to safely get CSRF Token
 */
const getCsrfToken = () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.content : "";
};

/**
 * REUSABLE HELPER: Attaches items to records
 */
const attachItemsToRecords = async (records) => {
    console.log(
        "🛠 [Sync Helper] Attaching items to",
        records.length,
        "records...",
    );

    try {
        const result = await Promise.all(
            records.map(async (record) => {
                try {
                    // This is the line that likely throws "Invalid key"
                    const items = await db.order_items
                        .where("orderable_id")
                        .equals(record.id)
                        .toArray();

                    return {
                        ...record,
                        items: items || [],
                    };
                } catch (innerErr) {
                    console.error(
                        "❌ [Sync Helper] Error mapping record ID:",
                        record.id,
                        innerErr,
                    );
                    throw innerErr; // Re-throw to be caught by the outer catch
                }
            }),
        );
        console.log("✅ [Sync Helper] Items attached successfully.");
        return result;
    } catch (err) {
        console.error("❌ [Sync Helper] CRITICAL FAILURE:", err);
        throw err; // Stop execution
    }
};

/**
 * SYNC LOGIC: ORDERS
 */
export const syncOrdersToServer = async () => {
    console.log("🔄 Starting order sync...");
    const unsyncedOrders = await db.orders
        .filter((order) => order.synced_at == null)
        .toArray();

    if (unsyncedOrders.length === 0) return;

    const payload = await attachItemsToRecords(unsyncedOrders);

    try {
        const response = await fetch("/sales/sync-orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": getCsrfToken(),
            },
            body: JSON.stringify({ orders: payload }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(
                "❌ Server rejected sync:",
                response.status,
                errorData,
            );
            throw new Error(`Server returned ${response.status}`);
        }

        const now = new Date().toISOString();
        for (const order of unsyncedOrders) {
            await db.orders.update(order.id, { synced_at: now });
            await db.order_items
                .where("orderable_id")
                .equals(order.id)
                .modify({ synced_at: now });
        }
        console.log("✅ Order sync complete.");
    } catch (err) {
        console.error("❌ Order sync failed:", err);
        throw err;
    }
};

/**
 * SYNC LOGIC: TABLES
 */
export const syncTablesToServer = async () => {
    console.log("🔄 Starting table sync...");
    const unsyncedTables = await db.open_tables
        .filter((table) => table.synced_at == null)
        .toArray();

    if (unsyncedTables.length === 0) return;

    const payload = await attachItemsToRecords(unsyncedTables);

    try {
        const response = await fetch("/sales/sync-tables", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": getCsrfToken(),
            },
            body: JSON.stringify({ tables: payload }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(
                "❌ Server rejected sync:",
                response.status,
                errorData,
            );
            throw new Error(`Server returned ${response.status}`);
        }

        const now = new Date().toISOString();
        for (const table of unsyncedTables) {
            await db.open_tables.update(table.id, { synced_at: now });
            await db.order_items
                .where("orderable_id")
                .equals(table.id)
                .modify({ synced_at: now });
        }
        console.log("✅ Table sync complete.");
    } catch (err) {
        console.error("❌ Table sync failed:", err);
        throw err;
    }
};

// Add these to your @/Utils/db.js
export const updateTableItemsLocal = async (tableId, items) => {
    // 1. Remove existing items for this specific table
    await db.order_items.where("orderable_id").equals(tableId).delete();

    // 2. Add the updated items from the cart
    for (const item of items) {
        await saveOrderItemLocal({
            id: crypto.randomUUID(),
            orderable_id: tableId,
            product_id: item.product_id,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            metadata: item.metadata || { type: "unit" },
            synced_at: null,
        });
    }

    // 3. Recalculate and update the table total
    const total = items.reduce(
        (sum, i) => sum + (parseFloat(i.subtotal) || 0),
        0,
    );
    await db.open_tables.update(tableId, { total_amount: total });
    console.log(
        `✅ Updated table ${tableId} with ${items.length} items and total ${total}`,
    );
};

/**
 * Fetch categories & units from server and save locally
 */
export const syncInventoryLocal = async () => {
    try {
        // 1. Fetch from backend
        const response = await fetch("/inventory/sync", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN":
                    document.querySelector('meta[name="csrf-token"]')
                        ?.content || "",
            },
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();

        // 2. Save categories
        if (data.categories && data.categories.length > 0) {
            await db.categories.bulkPut(
                data.categories.map((c) => ({
                    id: c.id,
                    shop_id: c.shop_id,
                    name: c.name,
                })),
            );
            console.log(
                `✅ Saved ${data.categories.length} categories locally`,
            );
        }

        // 3. Save units
        if (data.units && data.units.length > 0) {
            await db.units.bulkPut(
                data.units.map((u) => ({
                    id: u.id,
                    name: u.name,
                    type: u.type || null,
                })),
            );
            console.log(`✅ Saved ${data.units.length} units locally`);
        }

        return { categories: data.categories, units: data.units };
    } catch (err) {
        console.error("❌ Inventory sync failed:", err);
        throw err;
    }
};

/**
 * Closes the table and records the payment method used.
 * @param {string} tableId - The ID of the table to close.
 * @param {string} paymentMethod - The method selected (e.g., 'cash', 'card').
 */
export const closeTableLocal = async (tableId, paymentMethod) => {
    await db.open_tables.update(tableId, {
        status: "closed",
        payment_method: paymentMethod, // Store the method
        synced_at: null, // Reset sync to ensure the server updates the status/payment
    });
};

/**
 * STOCK COUNT HELPERS
 */

/**
 * Saves or updates a count in the local ledger.
 * Since product_id is the PK, this is idempotent.
 */
export const saveStockCountLocal = async (productId, totalBaseUnits) => {
    return await db.stock_counts.put({
        product_id: productId,
        quantity_total_base_units: totalBaseUnits,
        created_at: new Date().toISOString(),
    });
};

/**
 * Removes a specific count from the local ledger.
 */
export const deleteStockCountLocal = async (productId) => {
    return await db.stock_counts.delete(productId);
};

/**
 * Retrieves all pending stock counts.
 */
export const getAllStockCountsLocal = async () => {
    return await db.stock_counts.toArray();
};

export const syncStockCountsToServer = async () => {
    const counts = await getAllStockCountsLocal();
    if (counts.length === 0) {
        console.log("ℹ️ No pending stock counts to sync.");
        return;
    }

    console.log(`🔄 Syncing ${counts.length} stock counts...`);

    try {
        const response = await fetch(route("stock.count.reconcile"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": getCsrfToken(),
            },
            // Payload structure matches backend validation
            body: JSON.stringify({ counts: counts }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(
                "❌ Server rejected count sync:",
                response.status,
                errorData,
            );
            throw new Error(`Server returned ${response.status}`);
        }

        // IMPORTANT: The controller returns JSON confirming items processed.
        // Based on your approval, the controller returns { message: '...', processed_items: N }
        const result = await response.json();

        // Verify safety: Only wipe if the server acknowledges receipt.
        // Because the backend logic is idempotent (it matches existing values),
        // it is safe to wipe the local table after the POST returns 200.
        await db.stock_counts.clear();
        console.log(
            `✅ Stock count sync complete. Wiped local ledger. Server processed: ${result.processed_items}`,
        );

        return result;
    } catch (err) {
        console.error("❌ Stock count sync failed:", err);
        throw err; // Propagate error to UI
    }
};
