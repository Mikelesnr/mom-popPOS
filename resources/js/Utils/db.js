import Dexie from "dexie";

// 1. Initialize the database
export const db = new Dexie("MomnPopPWA");

db.version(1).stores({
    catalogs: "shop_id, menu, shot_sizes, synced_at",
    orders: "id, shift_id, table_id, total_amount, payment_method, status, created_at, synced_at",
    tables: "id, shift_id, name, current_order_id, synced_at",
    order_items:
        "id, order_id, product_id, quantity, unit_price, subtotal, shot_ratio, synced_at",
});

/**
 * Saves or updates the catalog for a specific shop.
 * Dexie's .put() handles both create and update automatically.
 */
export const saveCatalogLocal = async (shopId, data) => {
    return await db.catalogs.put({
        shop_id: shopId,
        ...data,
        synced_at: data.synced_at || new Date().toISOString(),
    });
};

/**
 * Retrieves the catalog for a specific shop.
 */
export const getCatalogLocal = async (shopId) => {
    return await db.catalogs.get(shopId);
};

/**
 * Example of how to add an order to the new transactional store
 */
export const saveOrderLocal = async (orderData) => {
    return await db.orders.put(orderData);
};
