// Sync/merge.js
//
// Pure rules for deciding which copy of a record wins. No I/O in here so it
// can be reasoned about (and tested) on its own.

import { compareHLC } from "./hlc";

// Tables that are replicated between devices. Catalog, stock counts and
// stock-add worksheets stay local on purpose.
export const REPLICATED_TABLES = ["users", "orders", "open_tables", "order_items"];

// A table (tab) only ever moves forward: open -> deferred -> closed/void.
// Rank beats the clock so that "closed" on one phone can never be undone by a
// slightly newer "open" edit made on another phone a moment earlier.
const STATUS_RANK = { open: 1, deferred: 2, closed: 3, void: 3 };

export const statusRank = (status) => STATUS_RANK[status] ?? 0;
export const isTerminalStatus = (status) => statusRank(status) === 3;

/**
 * Comparable version string for a record. Higher wins.
 * For open_tables the status rank comes first, then the clock.
 */
export function versionOf(table, rec) {
    if (!rec) return "";
    const hlc = rec._hlc || "";
    if (table === "open_tables") return `${statusRank(rec.status)}~${hlc}`;
    return hlc;
}

/** Returns "remote" when the remote copy should replace the local one. */
export function pickWinner(table, local, remote) {
    if (!remote) return "local";
    if (!local) return "remote";
    return compareHLC(versionOf(table, remote), versionOf(table, local)) > 0
        ? "remote"
        : "local";
}
