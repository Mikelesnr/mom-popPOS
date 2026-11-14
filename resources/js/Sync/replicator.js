// Sync/replicator.js
//
// Keeps the replicated Dexie tables identical on every device in a shop,
// with no device acting as the server. Every device holds a full copy and any
// of them can go offline at any time.
//
// How it works
//  - Local writes are stamped with a hybrid logical clock via Dexie hooks and
//    pushed to every connected peer right after the transaction commits.
//  - Incoming records are merged with merge.js (higher version wins) and
//    forwarded to the other peers, so a partly connected mesh still converges.
//  - When two devices connect (and once a minute after that) they swap digests
//    of the "working set" (current shift + anything not yet uploaded) and
//    pull whatever the other side has newer. This repairs anything that was
//    missed while a device was offline, asleep, or restarted.
//  - Table totals are derived data: after remote items arrive the total is
//    recomputed from the items instead of trusting whichever copy was newer.

import Dexie from "dexie";
import { compareHLC } from "./hlc";
import {
    REPLICATED_TABLES,
    pickWinner,
    versionOf,
    isTerminalStatus,
} from "./merge";

const BATCH = 150; // records per message

const round2 = (n) => Math.round(n * 100) / 100;

export function createReplicator({
    db,
    bus,
    hlc,
    deviceId,
    getContext, // () => ({ shopId, shiftId })
    onEvent = () => {},
    antiEntropyMs = 60_000,
}) {
    let outbox = new Map(); // table -> Set<key> waiting to be broadcast
    let flushScheduled = false;
    let timer = null;
    let running = false;
    const pendingByTx = new WeakMap();
    const subscriptions = []; // [table, hookName, fn]
    const unsubs = [];

    const emit = (e) => {
        try {
            onEvent(e);
        } catch (err) {
            console.error("[mesh] onEvent error", err);
        }
    };

    const isMeshTx = (trans) => !!(trans && trans.__mesh);

    // ------------------------------------------------------------------
    // Outbound: capture local writes
    // ------------------------------------------------------------------

    function queue(table, key) {
        if (!outbox.has(table)) outbox.set(table, new Set());
        outbox.get(table).add(key);
        if (!flushScheduled) {
            flushScheduled = true;
            setTimeout(() => {
                flushOutbox().catch((err) => emit({ type: "error", err }));
            }, 0);
        }
    }

    // Broadcast only after the transaction commits, so we never announce a
    // write that ends up rolled back.
    function track(trans, table, key) {
        let list = pendingByTx.get(trans);
        if (!list) {
            list = [];
            pendingByTx.set(trans, list);
            trans.on("complete", () => {
                list.forEach(([t, k]) => queue(t, k));
                pendingByTx.delete(trans);
            });
            trans.on("abort", () => pendingByTx.delete(trans));
        }
        list.push([table, key]);
    }

    function subscribe(table, hookName, fn) {
        db[table].hook(hookName, fn);
        subscriptions.push([table, hookName, fn]);
    }

    function installHooks() {
        for (const table of REPLICATED_TABLES) {
            subscribe(table, "creating", function (primKey, obj, trans) {
                if (isMeshTx(trans)) return;
                obj._hlc = hlc.tick();
                obj._origin = deviceId;
                track(trans, table, primKey ?? obj.id);
            });

            subscribe(table, "updating", function (mods, primKey, obj, trans) {
                if (isMeshTx(trans)) return;
                track(trans, table, primKey);
                return { _hlc: hlc.tick(), _origin: deviceId };
            });

            subscribe(table, "deleting", function (primKey, obj, trans) {
                if (isMeshTx(trans)) return;
                // Deletes are not replicated. Replicated tables are append and
                // update only, so a stray delete here is almost certainly a bug.
                console.warn(
                    `[mesh] delete on replicated table "${table}" will NOT reach other devices`,
                    primKey,
                );
            });
        }
    }

    function removeHooks() {
        for (const [table, hookName, fn] of subscriptions) {
            try {
                db[table].hook(hookName).unsubscribe(fn);
            } catch {
                /* db already closed */
            }
        }
        subscriptions.length = 0;
    }

    function chunk(arr, n) {
        const out = [];
        for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
        return out;
    }

    function sendRecs(peerId, recs) {
        for (const part of chunk(recs, BATCH)) bus.send(peerId, { t: "recs", recs: part });
    }

    function broadcastRecs(recs, exceptPeerId = null) {
        for (const part of chunk(recs, BATCH)) {
            bus.broadcast({ t: "recs", recs: part }, exceptPeerId);
        }
    }

    async function flushOutbox() {
        flushScheduled = false;
        const snapshot = outbox;
        outbox = new Map();
        if (!running) return;
        // Nobody connected: nothing to do. The digest exchange when a peer
        // connects will hand them everything they are missing.
        if (bus.peerIds().length === 0) return;

        const recs = [];
        for (const [table, keys] of snapshot) {
            const rows = await db[table].bulkGet([...keys]);
            rows.forEach((r) => r && recs.push({ table, rec: r }));
        }
        if (recs.length) broadcastRecs(recs);
    }

    // ------------------------------------------------------------------
    // Working set + digests
    // ------------------------------------------------------------------

    async function workingSet(shiftIds) {
        const { shopId } = getContext();
        const shifts = new Set(shiftIds.filter(Boolean));
        const inScope = (r) =>
            r.shop_id === shopId && (r.synced_at == null || shifts.has(r.shift_id));

        const set = {};
        set.users = await db.users.toArray();
        set.orders = await db.orders.filter(inScope).toArray();
        set.open_tables = await db.open_tables
            .filter(
                (r) =>
                    inScope(r) ||
                    (r.shop_id === shopId &&
                        (r.status === "open" || r.status === "deferred")),
            )
            .toArray();

        const parentIds = [
            ...set.orders.map((o) => o.id),
            ...set.open_tables.map((t) => t.id),
        ];
        set.order_items = parentIds.length
            ? await db.order_items.where("orderable_id").anyOf(parentIds).toArray()
            : [];

        await stampMissing(set);
        return set;
    }

    // Records created before this feature existed carry no clock. Give them
    // one (silently, without announcing) so they can take part in digests.
    async function stampMissing(set) {
        const missing = [];
        for (const t of REPLICATED_TABLES) {
            for (const r of set[t]) if (!r._hlc) missing.push([t, r]);
        }
        if (missing.length === 0 || !running) return;

        await db.transaction(
            "rw",
            db.users,
            db.orders,
            db.open_tables,
            db.order_items,
            async () => {
                Dexie.currentTransaction.__mesh = true;
                for (const [t, r] of missing) {
                    const patch = { _hlc: hlc.tick(), _origin: deviceId };
                    await db[t].update(r.id, patch);
                    Object.assign(r, patch);
                }
            },
        );
    }

    function toDigest(set) {
        const d = {};
        for (const t of REPLICATED_TABLES) {
            d[t] = {};
            for (const r of set[t]) d[t][r.id] = versionOf(t, r);
        }
        return d;
    }

    async function sendDigest(peerId) {
        if (!running) return;
        const ctx = getContext();
        const set = await workingSet([ctx.shiftId]);
        if (!running) return;
        bus.send(peerId, {
            t: "digest",
            hlc: hlc.current(),
            shiftId: ctx.shiftId ?? null,
            d: toDigest(set),
        });
    }

    async function onDigest(msg, from) {
        if (!running) return;
        hlc.receive(msg.hlc);
        const ctx = getContext();
        // Look at both our current shift and theirs, so a device that is a
        // shift behind still gets everything it needs.
        const set = await workingSet([ctx.shiftId, msg.shiftId]);
        if (!running) return;

        const want = {};
        const send = [];
        for (const t of REPLICATED_TABLES) {
            const remote = (msg.d && msg.d[t]) || {};
            const local = new Map(set[t].map((r) => [r.id, r]));
            const wanted = [];

            for (const [id, remoteVersion] of Object.entries(remote)) {
                const lr = local.get(id);
                if (!lr) {
                    wanted.push(id);
                    continue;
                }
                const c = compareHLC(versionOf(t, lr), remoteVersion);
                if (c < 0) wanted.push(id);
                else if (c > 0) send.push({ table: t, rec: lr });
            }
            for (const [id, lr] of local) {
                if (!(id in remote)) send.push({ table: t, rec: lr });
            }
            if (wanted.length) want[t] = wanted;
        }

        if (send.length) sendRecs(from, send);
        if (Object.keys(want).length) bus.send(from, { t: "pull", want });
    }

    async function onPull(msg, from) {
        if (!running) return;
        const { shopId } = getContext();
        const send = [];
        for (const [t, ids] of Object.entries(msg.want || {})) {
            if (!REPLICATED_TABLES.includes(t) || !Array.isArray(ids)) continue;
            const rows = await db[t].bulkGet(ids);
            for (const r of rows) {
                if (!r) continue;
                if ((t === "orders" || t === "open_tables") && r.shop_id !== shopId) continue;
                send.push({ table: t, rec: r });
            }
        }
        if (send.length) sendRecs(from, send);
    }

    // ------------------------------------------------------------------
    // Inbound: merge records from a peer
    // ------------------------------------------------------------------

    async function onRecs(msg, from) {
        if (!running || !Array.isArray(msg.recs)) return;
        const { shopId } = getContext();
        const changed = [];

        await db.transaction(
            "rw",
            db.users,
            db.orders,
            db.open_tables,
            db.order_items,
            async () => {
                Dexie.currentTransaction.__mesh = true;
                for (const { table, rec } of msg.recs) {
                    if (!REPLICATED_TABLES.includes(table)) continue;
                    if (!rec || typeof rec.id !== "string") continue;
                    // Never let another shop's data in, whatever the peer claims.
                    if ((table === "orders" || table === "open_tables") && rec.shop_id !== shopId) {
                        continue;
                    }
                    hlc.receive(rec._hlc);

                    const local = await db[table].get(rec.id);
                    if (pickWinner(table, local, rec) === "remote") {
                        await db[table].put(rec);
                        changed.push({ table, rec });
                    }
                }
            },
        );

        if (changed.length === 0) return;

        // Forward what was new to us so peers that cannot see the sender still
        // get it. Records that do not change a receiver stop the chain there.
        broadcastRecs(changed, from);

        await afterApply(changed);
        emit({
            type: "applied",
            from,
            count: changed.length,
            tables: [...new Set(changed.map((c) => c.table))],
        });
    }

    async function afterApply(changed) {
        const parents = new Set();
        for (const { table, rec } of changed) {
            if (table === "order_items" && rec.orderable_id) parents.add(rec.orderable_id);
            if (table === "open_tables") parents.add(rec.id);
        }
        for (const id of parents) await reconcileTable(id, changed);
    }

    // A table's total is derived from its items. Two devices adding items at
    // the same moment would otherwise leave whichever total happened to be
    // newer, which is wrong for both.
    async function reconcileTable(tableId, changed) {
        const tbl = await db.open_tables.get(tableId);
        if (!tbl) return;

        if (isTerminalStatus(tbl.status)) {
            // Money already settled. An item stamped after the close means
            // someone kept ringing items onto a paid table.
            for (const { table, rec } of changed) {
                if (
                    table === "order_items" &&
                    rec.orderable_id === tableId &&
                    compareHLC(rec._hlc, tbl._hlc) > 0
                ) {
                    emit({
                        type: "anomaly",
                        kind: "item_after_close",
                        tableId,
                        tableName: tbl.name,
                        itemId: rec.id,
                        itemName: rec.name,
                    });
                }
            }
            return;
        }

        const items = await db.order_items.where("orderable_id").equals(tableId).toArray();
        const sum = round2(items.reduce((s, i) => s + (parseFloat(i.subtotal) || 0), 0));
        const current = parseFloat(tbl.total_amount) || 0;
        if (Math.abs(current - sum) > 0.0001) {
            // Normal local write: stamped by the hook and announced to peers.
            await db.open_tables.update(tableId, { total_amount: sum });
        }
    }

    // ------------------------------------------------------------------
    // Lifecycle
    // ------------------------------------------------------------------

    const guard = (fn) => (msg, from) =>
        fn(msg, from).catch((err) => emit({ type: "error", err }));

    return {
        start() {
            if (running) return;
            running = true;
            installHooks();
            unsubs.push(
                bus.on("digest", guard(onDigest)),
                bus.on("pull", guard(onPull)),
                bus.on("recs", guard(onRecs)),
                bus.onPeerUp((peerId) => {
                    sendDigest(peerId).catch((err) => emit({ type: "error", err }));
                }),
            );
            if (antiEntropyMs > 0) {
                timer = setInterval(() => {
                    bus.peerIds().forEach((id) =>
                        sendDigest(id).catch((err) => emit({ type: "error", err })),
                    );
                }, antiEntropyMs);
            }
        },

        stop() {
            running = false;
            outbox = new Map();
            removeHooks();
            unsubs.splice(0).forEach((u) => u());
            if (timer) clearInterval(timer);
            timer = null;
        },

        /** Ask every peer (or one) to reconcile right now. */
        syncNow(peerId) {
            const ids = peerId ? [peerId] : bus.peerIds();
            return Promise.all(ids.map((id) => sendDigest(id)));
        },

        // exposed for tests and diagnostics
        workingSet,
    };
}
