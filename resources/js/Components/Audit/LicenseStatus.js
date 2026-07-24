import axios from "axios";

const STORAGE_KEY = "terminal_paid_status";

/**
 * Reads the cached paid status from localStorage.
 * Fails OPEN (returns true) if the key was never set - covers first install
 * before the first login response has landed, and shops onboarded before
 * this feature existed. Flip the default to `false` if you'd rather fail closed.
 */
export function getCachedPaidStatus() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    return raw === "true";
}

/**
 * Call this right after a successful login response, alongside wherever
 * you already cache shop_id in localStorage on first pairing.
 */
export function setCachedPaidStatus(paidStatus) {
    localStorage.setItem(STORAGE_KEY, paidStatus ? "true" : "false");
}

/**
 * Pings the server for the current status and refreshes the local cache.
 * Call this on app load and on your existing sync interval - safe to call
 * offline, it just silently no-ops and keeps the last known cached value.
 */
export async function refreshPaidStatus(shopId) {
    try {
        const { data } = await axios.get("/license/status", {
            params: { shopId },
        });
        setCachedPaidStatus(data.paid_status);
        return data;
    } catch (err) {
        // Offline or request failed - keep whatever's already cached
        console.warn("License status refresh failed, using cached value", err);
        return null;
    }
}
