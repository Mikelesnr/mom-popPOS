import Dexie from "dexie";
import { handleSyncError } from "./SyncUtils";

// Initialize the database
export const db = new Dexie("MomnPopPWA");

/**
 * VERSION 6 SCHEMA
 * 1. Added 'metadata.type' index to order_items for fast report generation.
 * 2. Standardized indexes across all stores.
 */
db.version(10).stores({
    catalogs: "shop_id",
    orders: "id, shop_id, shift_id, user_id, status, created_at, synced_at",
    open_tables:
        "id, shop_id, shift_id, user_id, status, created_at, synced_at",
    order_items: "id, orderable_id, product_id, placed, synced_at, metadata",
    categories: "id, shop_id, name",
    units: "id, name, type",
    stock_counts: "product_id, quantity_total_base_units, created_at",
    temp_stock_adds: "product_id, added_quantity, created_at",
    shops: "id, name, shop_type",
    shop_owners: "id, shop_id, user_id",
    users: "id, name, role",
});

/**
 * Dumps the entire owner's portfolio into Dexie.
 * Call this after a successful login or explicit manual sync.
 */
export const syncPortfolioToDexie = async (shops) => {
    await db.transaction("rw", db.shops, async () => {
        for (const shop of shops) {
            await db.shops.put(shop); // .put() handles the "upsert" automatically
        }
    });
};

/**
 * Get all shops for the owner from Dexie.
 */
export const getAllShopsLocal = async () => {
    return await db.shops.toArray();
};

/**
 * Ensures a user exists in the local Dexie store.
 */
export const syncUserToDexie = async (user) => {
    const existing = await db.users.get(user.id);
    if (!existing) {
        await db.users.add({
            id: user.id,
            name: user.name,
            role: user.role,
        });
        console.log(`✅ User ${user.name} synced to Dexie.`);
    }
};

/**
 * Clears the user cache during shift end (Cashup).
 */
export const clearUsersLocal = async () => {
    await db.users.clear();
    console.log("✅ User cache cleared after shift completion.");
};

/**
 * Checks if there are any tables that are not synced or are still open.
 * Returns true if the cashup should be blocked.
 */
export const hasPendingTables = async () => {
    // Check for tables that are either still 'open' or have not been synced yet
    const pendingTables = await db.open_tables
        .filter((t) => t.status === "open" || t.synced_at === null)
        .toArray();

    return pendingTables.length > 0;
};

/**
 * Just-in-Time Reconciliation
 * Call this at the start of syncOrdersToServer and syncTablesToServer
 */
const getAndEnsureShiftConsistency = async () => {
    const activeShiftId = localStorage.getItem("terminal_shift_id");

    if (!activeShiftId) return; // Or handle the case where no shift is active

    // Reconcile Orders
    const staleOrders = await db.orders
        .filter((o) => !o.synced_at && o.shift_id !== activeShiftId)
        .toArray();

    for (const order of staleOrders) {
        await db.orders.update(order.id, { shift_id: activeShiftId });
    }

    // Reconcile Tables
    const staleTables = await db.open_tables
        .filter((t) => !t.synced_at && t.shift_id !== activeShiftId)
        .toArray();

    for (const table of staleTables) {
        await db.open_tables.update(table.id, { shift_id: activeShiftId });
    }
};

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
 * Saves a single order item to Dexie.
 * Because it is being saved locally, it is immediately considered 'placed' (immutable).
 */
export const saveOrderItemLocal = async (itemData) => {
    // Ensure we have a valid ID, generate one if missing (highly recommended)
    const itemId = itemData.id || crypto.randomUUID();

    return await db.order_items.put({
        ...itemData, // Spread incoming data
        id: itemId, // Enforce ID
        placed: 1, // <--- CRITICAL: Every item saved locally is immediately immutable
        synced_at: null, // Ensure not marked as synced yet
        // Ensure metadata is always an object, fallback to empty object or default
        metadata:
            itemData.metadata && typeof itemData.metadata === "object"
                ? itemData.metadata
                : {},
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
    await getAndEnsureShiftConsistency();

    // 1. Get current context
    const currentShopId = localStorage.getItem("terminal_shop_id");
    const localUsers = await db.users.toArray();
    const localUserIds = new Set(localUsers.map((u) => u.id));

    // 2. Filter orders by shop_id and ensure user exists locally
    const unsyncedOrders = await db.orders
        .filter(
            (o) =>
                o.synced_at == null &&
                o.shop_id === currentShopId &&
                localUserIds.has(o.user_id),
        )
        .toArray();

    if (unsyncedOrders.length === 0) return;

    const response = await fetch("/sales/sync-orders", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
            orders: await attachItemsToRecords(unsyncedOrders),
        }),
    });

    if (!response.ok) {
        throw new Error(await handleSyncError(response));
    }

    const now = new Date().toISOString();
    for (const order of unsyncedOrders) {
        await db.orders.update(order.id, { synced_at: now });
        await db.order_items
            .where("orderable_id")
            .equals(order.id)
            .modify({ synced_at: now });
    }
};

/**
 * SYNC LOGIC: TABLES
 * Sync tables that are finalized (closed) or need to be moved
 * off the device (deferred at end of shift).
 */
export const syncTablesToServer = async () => {
    await getAndEnsureShiftConsistency();

    // 1. Get current shop context
    const currentShopId = localStorage.getItem("terminal_shop_id");

    // 2. Filter tables by shop_id and synced status
    const tablesToSync = await db.open_tables
        .filter((t) => t.synced_at == null && t.shop_id === currentShopId)
        .toArray();

    if (tablesToSync.length === 0) return;

    const response = await fetch("/sales/sync-tables", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
            tables: await attachItemsToRecords(tablesToSync),
        }),
    });

    if (!response.ok) throw new Error(await handleSyncError(response));

    const now = new Date().toISOString();
    for (const table of tablesToSync) {
        await db.open_tables.update(table.id, { synced_at: now });
        await db.order_items
            .where("orderable_id")
            .equals(table.id)
            .modify({ synced_at: now });
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

// --- HELPER FUNCTIONS FOR ADD STOCK WORKFLOW ---
/**
 * Adds or updates a stock entry in the temporary local table.
 * Since product_id is the Primary Key, calling put() performs an upsert:
 * - If product_id exists, it overwrites the record.
 * - If product_id does not exist, it creates a new record.
 *
 * @param {object} product - The product object (must contain .id)
 * @param {number|string} quantityToAdd - The amount to add
 */
export async function addStockLocally(product, quantityToAdd) {
    const pid = product.id;
    const qtyFloat = parseFloat(quantityToAdd);

    if (!pid) throw new Error("Product ID missing.");
    if (isNaN(qtyFloat) || qtyFloat <= 0) throw new Error("Invalid quantity.");

    return db.temp_stock_adds
        .put({
            product_id: pid,
            added_quantity: qtyFloat,
        })
        .then(() => {
            console.log(
                `Queued stock add locally for P:${pid}, Qty:${qtyFloat}`,
            );
        });
}

/**
 * Retrieves all pending stock adds formatted for the backend bulk API.
 */
export async function getPendingStockAddsLocal() {
    return await db.temp_stock_adds.toArray();
}

/**
 * Deletes a specific pending addition from the temporary table.
 *
 * @param {string} productId - The UUID of the product to remove.
 */
export async function deleteStockAddLocal(productId) {
    return db.temp_stock_adds.delete(productId).then(() => {
        console.log(`Deleted local stock add queue for P:${productId}`);
    });
}

/**
 * Clears the temporary table after a successful sync.
 */
export async function clearPendingStockAdds(idsToRemove) {
    return db.transaction("rw", db.temp_stock_adds, async () => {
        await db.temp_stock_adds.bulkDelete(idsToRemove);
        console.log(
            `Cleared ${idsToRemove.length} synced items from local DB.`,
        );
    });
}

/**
 * Deletes a pending stock addition from the local temporary table.
 * Used when the user 'unlocks' (cancels) the addition in the UI.
 *
 * @param {string} productId - The UUID of the product to remove from queue.
 */
export async function deleteStockLocally(productId) {
    return db.transaction("rw", db.temp_stock_adds, async () => {
        // Find the record by product_id (which is indexed)
        const existing = await db.temp_stock_adds
            .where("product_id")
            .equals(productId)
            .first();

        if (existing) {
            // Delete it using the auto-increment key (id)
            await db.temp_stock_adds.delete(existing.id);
            console.log(`Deleted local stock add queue for P:${productId}`);
        } else {
            console.warn(
                `Attempted to delete non-existent queue for P:${productId}`,
            );
        }
    });
}

/**
 * Clears successfully synced additions from Dexie.
 */
export async function clearSyncedStockAddsLocal(shopId) {
    return db.transaction("rw", db.temp_stock_adds, async () => {
        const keys = await db.temp_stock_adds
            .where("shop_id")
            .equals(shopId)
            .primaryKeys();
        await db.temp_stock_adds.bulkDelete(keys);
    });
}

/**
 * Syncs pending local stock additions to the Laravel backend.
 * This function is called by the Parent Component.
 */
export async function syncStockAddsToServer(shopId) {
    // Although technically redundant in the controller, we pass shopId
    // for consistency with catalogue fetching logs.
    if (!shopId) throw new Error("No active shop ID available for sync.");

    // 1. Fetch ALL pending items globally
    const pending = await getPendingStockAddsLocal();

    if (pending.length === 0) {
        return { synced_count: 0 };
    }

    console.log(`🔄 Syncing ${pending.length} global pending stock adds...`);

    // 2. Prepare payload
    const payload = {
        updates: pending.map((item) => ({
            product_id: item.product_id,
            added_quantity: item.added_quantity,
        })),
    };

    try {
        // 3. Send to backend
        const response = await window.axios.put(
            route("stock.add-stock"),
            payload,
        );

        // 4. If backend confirms success globally, WIPE the local table.
        if (response.status === 200 || response.status === 207) {
            // Matches logic of syncStockCountsToServer()
            await db.temp_stock_adds.clear();
            console.log("✅ Stock add sync successful and temp DB cleared.");
        }
        return response.data;
    } catch (err) {
        console.error("❌ Stock add sync failed:", err);
        throw err;
    }
}
