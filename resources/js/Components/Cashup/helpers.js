// Canonical payment method list + display order, used everywhere totals are broken down.
export const PAYMENT_METHODS = [
    "cash",
    "card",
    "ecocash",
    "onemoney",
    "inbucks",
    "omari",
];

export const BLIND_FIELDS = [
    ["blind_cash_reported", "Cash"],
    ["blind_ecocash_reported", "EcoCash"],
    ["blind_swipe_reported", "Swipe"],
    ["blind_onemoney_reported", "OneMoney"],
];

export const HISTORY_PAGE_SIZE = 8;

export function formatShiftDate(dateString) {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

export function money(value) {
    const n = Number(value || 0);
    return `$${n.toFixed(2)}`;
}

// Payload quantities come through as fixed 3-decimal strings ("2.000").
// Show whole numbers cleanly, trim to at most 2dp otherwise.
export function qty(value) {
    const n = Number(value || 0);
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

// Collapses a flat list of order/table line items into one row per
// product+serving-size, summing quantity and subtotal. Used so X-slips
// and the shop-wide Z-slip show "3 x Castle Lager" instead of three
// separate lines from three separate orders.
export function groupItems(items) {
    const map = new Map();
    for (const item of items) {
        const key = `${item.product_id}__${item.metadata}`;
        const q = Number(item.quantity || 0);
        const sub = Number(item.subtotal || 0);
        if (map.has(key)) {
            const existing = map.get(key);
            existing.quantity += q;
            existing.subtotal += sub;
        } else {
            map.set(key, {
                id: key,
                name: item.name,
                metadata: item.metadata,
                unit_price: Number(item.unit_price || 0),
                quantity: q,
                subtotal: sub,
            });
        }
    }
    return Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
    );
}
