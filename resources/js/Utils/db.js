const DB_NAME = "FOHTerminalDB";
const DB_VERSION = 1;

export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Key by shop_id to isolate multi-tenant data safely
            if (!db.objectStoreNames.contains("catalog")) {
                db.createObjectStore("catalog", { keyPath: "shop_id" });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

export const saveCatalogLocal = async (shopId, data) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["catalog"], "readwrite");
        const store = transaction.objectStore("catalog");
        // ✅ Use the UUID string directly
        store.put({ shop_id: shopId, ...data });

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getCatalogLocal = async (shopId) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["catalog"], "readonly");
        const store = transaction.objectStore("catalog");
        // ✅ Query with the UUID string
        const request = store.get(shopId);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};
