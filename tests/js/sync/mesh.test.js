// Replication engine tests: several simulated devices, each with its own
// Dexie database, wired together with in-memory links (no WebRTC involved).
//
// Run (see tests/js/README.md):  npx vitest run --config tests/js/vitest.config.js

import "fake-indexeddb/auto";
import Dexie from "dexie";
import { createBus } from "../../../resources/js/Sync/bus";
import { createHLC, compareHLC, parseHLC } from "../../../resources/js/Sync/hlc";
import { createReplicator } from "../../../resources/js/Sync/replicator";
import { encodeFrames, createReassembler } from "../../../resources/js/Sync/framing";
import { pickWinner, versionOf } from "../../../resources/js/Sync/merge";

const SHOP = "shop-1";
const SHIFT = "shift-1";

// One shared fake wall clock so tests control "who edited later".
const clock = { t: 1_800_000_000_000 };
const now = () => clock.t;
const advance = (ms = 10) => (clock.t += ms);
const sleep = (ms = 60) => new Promise((r) => setTimeout(r, ms));

let dbCounter = 0;
function newDb() {
    const db = new Dexie(`mesh-test-${++dbCounter}-${Math.random()}`);
    // Same stores as resources/js/Utils/db.js (version 11)
    db.version(11).stores({
        catalogs: "shop_id",
        orders: "id, shop_id, shift_id, user_id, status, created_at, synced_at",
        open_tables: "id, shop_id, shift_id, user_id, status, created_at, synced_at",
        order_items: "id, orderable_id, product_id, placed, synced_at, metadata",
        categories: "id, shop_id, name",
        units: "id, name, type",
        stock_counts: "product_id, quantity_total_base_units, created_at",
        temp_stock_adds: "product_id, added_quantity, created_at",
        shops: "id, name, shop_type",
        shop_owners: "id, shop_id, user_id",
        users: "id, name, role",
        payment_methods: "id, name, slug",
    });
    return db;
}

const net = { blocked: new Set(), sent: 0 };
const pairKey = (a, b) => [a, b].sort().join("|");

function makeDevice(id, ctx = { shopId: SHOP, shiftId: SHIFT }) {
    const db = newDb();
    const bus = createBus(id);
    const hlc = createHLC({ deviceId: id.padEnd(8, "0"), now });
    const events = [];
    const rep = createReplicator({
        db,
        bus,
        hlc,
        deviceId: id,
        getContext: () => ctx,
        onEvent: (e) => events.push(e),
        antiEntropyMs: 0,
    });
    rep.start();
    return { id, db, bus, hlc, rep, events, ctx };
}

// Two-way in-memory link, asynchronous like a real data channel.
function connect(a, b) {
    const mk = (from, to) => ({
        info: { name: to.id },
        send(msg) {
            if (net.blocked.has(pairKey(from.id, to.id))) return;
            net.sent += 1;
            const copy = JSON.parse(JSON.stringify(msg));
            setTimeout(() => to.bus.receive(from.id, copy), 0);
        },
        close() {},
    });
    a.bus.attach(b.id, mk(a, b));
    b.bus.attach(a.id, mk(b, a));
}

function disconnect(a, b) {
    a.bus.detach(b.id);
    b.bus.detach(a.id);
}

const order = (over = {}) => ({
    id: crypto.randomUUID(),
    shop_id: SHOP,
    shift_id: SHIFT,
    user_id: "u1",
    total_amount: 5,
    payment_method: "cash",
    status: "paid",
    created_at: new Date(now()).toISOString(),
    synced_at: null,
    ...over,
});

const table = (over = {}) => ({
    id: crypto.randomUUID(),
    shop_id: SHOP,
    shift_id: SHIFT,
    user_id: "u1",
    name: "T1",
    total_amount: 0,
    payment_method: null,
    status: "open",
    created_at: new Date(now()).toISOString(),
    synced_at: null,
    ...over,
});

const item = (tableId, over = {}) => ({
    id: crypto.randomUUID(),
    orderable_id: tableId,
    product_id: "p1",
    name: "Castle",
    quantity: 1,
    unit_price: 2,
    subtotal: 2,
    placed: 1,
    synced_at: null,
    metadata: { type: "unit" },
    ...over,
});

beforeEach(() => {
    net.blocked.clear();
    net.sent = 0;
});

// ----------------------------------------------------------------------
describe("hlc", () => {
    it("is monotonic even if the wall clock stalls or goes backwards", () => {
        let t = 1000;
        const h = createHLC({ deviceId: "aaaaaaaa", now: () => t });
        const a = h.tick();
        t = 500; // clock jumps back
        const b = h.tick();
        expect(compareHLC(b, a)).toBe(1);
    });

    it("orders by time, then counter, then device", () => {
        const a = createHLC({ deviceId: "aaaaaaaa", now: () => 5000 }).tick();
        const b = createHLC({ deviceId: "bbbbbbbb", now: () => 5000 }).tick();
        expect(compareHLC(a, b)).toBe(-1);
        expect(parseHLC(a).ms).toBe(5000);
    });

    it("clamps a remote clock that is absurdly far in the future", () => {
        let t = 1_000_000;
        const h = createHLC({ deviceId: "aaaaaaaa", now: () => t, maxDriftMs: 60_000 });
        const future = createHLC({ deviceId: "bbbbbbbb", now: () => t + 10 * 86_400_000 }).tick();
        h.receive(future);
        expect(parseHLC(h.tick()).ms).toBeLessThanOrEqual(t + 60_000 + 1);
    });

    it("persists and resumes", () => {
        let store = null;
        const h1 = createHLC({ deviceId: "aaaaaaaa", now: () => 9000, save: (s) => (store = s) });
        const a = h1.tick();
        const h2 = createHLC({ deviceId: "aaaaaaaa", now: () => 1, load: () => store });
        expect(compareHLC(h2.tick(), a)).toBe(1);
    });
});

// ----------------------------------------------------------------------
describe("framing", () => {
    it("round-trips a message bigger than one frame, out of order, with unicode", () => {
        const big = { t: "x", text: "naïve café ☕ ".repeat(3000), n: [1, 2, 3] };
        const frames = encodeFrames(big);
        expect(frames.length).toBeGreaterThan(1);
        frames.forEach((f) => expect(new TextEncoder().encode(f).length).toBeLessThan(16_000));

        const r = createReassembler();
        let out = null;
        for (const f of [...frames].reverse()) out = r.push(f) || out;
        expect(out).toEqual(big);
    });

    it("ignores garbage frames", () => {
        const r = createReassembler();
        expect(r.push("nope")).toBeNull();
        expect(r.push("a|9|2|x")).toBeNull();
        expect(r.push(42)).toBeNull();
    });
});

// ----------------------------------------------------------------------
describe("merge rules", () => {
    it("closed beats a newer open edit; deferred beats open; clock decides otherwise", () => {
        const closedOld = { status: "closed", _hlc: "000000000000001.00000.aaaaaaaa" };
        const openNew = { status: "open", _hlc: "000000000000009.00000.bbbbbbbb" };
        expect(pickWinner("open_tables", closedOld, openNew)).toBe("local");
        expect(pickWinner("open_tables", openNew, closedOld)).toBe("remote");

        const deferred = { status: "deferred", _hlc: "000000000000001.00000.aaaaaaaa" };
        expect(pickWinner("open_tables", deferred, openNew)).toBe("local");

        const a = { status: "closed", _hlc: "000000000000002.00000.aaaaaaaa" };
        const b = { status: "void", _hlc: "000000000000003.00000.bbbbbbbb" };
        expect(pickWinner("open_tables", a, b)).toBe("remote");
        expect(pickWinner("orders", { _hlc: "2" }, { _hlc: "1" })).toBe("local");
        expect(versionOf("orders", null)).toBe("");
    });
});

// ----------------------------------------------------------------------
describe("live replication between two devices", () => {
    it("a table and its items opened on A show up on B", async () => {
        const A = makeDevice("A");
        const B = makeDevice("B");
        connect(A, B);
        await sleep();

        const t = table({ name: "Window seat" });
        await A.db.open_tables.put(t);
        await A.db.order_items.put(item(t.id));
        await sleep();

        expect((await B.db.open_tables.get(t.id)).name).toBe("Window seat");
        expect(await B.db.order_items.where("orderable_id").equals(t.id).count()).toBe(1);
    });

    it("updates (status, synced_at) propagate and do not echo forever", async () => {
        const A = makeDevice("A");
        const B = makeDevice("B");
        connect(A, B);
        const o = order();
        await A.db.orders.put(o);
        await sleep();

        advance();
        await B.db.orders.update(o.id, { synced_at: "2026-11-13T10:00:00Z" });
        await sleep();
        expect((await A.db.orders.get(o.id)).synced_at).toBe("2026-11-13T10:00:00Z");

        const before = net.sent;
        await sleep(150);
        expect(net.sent).toBe(before); // quiet: no ping-pong
    });

    it("a remote write is not re-stamped as a local edit", async () => {
        const A = makeDevice("A");
        const B = makeDevice("B");
        connect(A, B);
        const o = order();
        await A.db.orders.put(o);
        await sleep();
        const a = await A.db.orders.get(o.id);
        const b = await B.db.orders.get(o.id);
        expect(b._hlc).toBe(a._hlc);
        expect(b._origin).toBe("A");
    });
});

// ----------------------------------------------------------------------
describe("conflicts", () => {
    it("two devices adding items to the same table at once keep both and agree on the total", async () => {
        const A = makeDevice("A");
        const B = makeDevice("B");
        connect(A, B);
        const t = table({ name: "Bar 4" });
        await A.db.open_tables.put(t);
        await sleep();

        // both add an item at the same moment (partitioned, so neither sees the other)
        net.blocked.add(pairKey("A", "B"));
        advance();
        await A.db.order_items.put(item(t.id, { subtotal: 3, name: "Lager" }));
        await A.db.open_tables.update(t.id, { total_amount: 3 });
        advance();
        await B.db.order_items.put(item(t.id, { subtotal: 5, name: "Gin" }));
        await B.db.open_tables.update(t.id, { total_amount: 5 });
        await sleep();

        net.blocked.clear();
        await A.rep.syncNow();
        await B.rep.syncNow();
        await sleep(200);

        for (const dev of [A, B]) {
            const items = await dev.db.order_items.where("orderable_id").equals(t.id).toArray();
            expect(items.map((i) => i.name).sort()).toEqual(["Gin", "Lager"]);
            expect((await dev.db.open_tables.get(t.id)).total_amount).toBe(8);
        }
    });

    it("a table closed on one device cannot be reopened by a newer edit elsewhere", async () => {
        const A = makeDevice("A");
        const B = makeDevice("B");
        connect(A, B);
        const t = table();
        await A.db.open_tables.put(t);
        await sleep();

        net.blocked.add(pairKey("A", "B"));
        advance();
        await A.db.open_tables.update(t.id, { status: "closed", payment_method: { method: "cash" } });
        advance(5000);
        await B.db.open_tables.update(t.id, { name: "renamed", status: "open" }); // later clock, lower rank
        net.blocked.clear();
        await A.rep.syncNow();
        await B.rep.syncNow();
        await sleep(200);

        expect((await A.db.open_tables.get(t.id)).status).toBe("closed");
        expect((await B.db.open_tables.get(t.id)).status).toBe("closed");
    });

    it("flags an item rung onto a table after it was paid", async () => {
        const A = makeDevice("A");
        const B = makeDevice("B");
        connect(A, B);
        const t = table();
        await A.db.open_tables.put(t);
        await sleep();

        net.blocked.add(pairKey("A", "B"));
        advance();
        await A.db.open_tables.update(t.id, { status: "closed" });
        advance(1000);
        await B.db.order_items.put(item(t.id, { name: "Late round" }));
        net.blocked.clear();
        await B.rep.syncNow();
        await A.rep.syncNow();
        await sleep(200);

        const anomaly = A.events.find((e) => e.type === "anomaly");
        expect(anomaly?.kind).toBe("item_after_close");
        expect(anomaly?.itemName).toBe("Late round");
    });
});

// ----------------------------------------------------------------------
describe("offline catch-up and topology", () => {
    it("a device that was offline catches up on connect, and its own work flows back", async () => {
        const A = makeDevice("A");
        const B = makeDevice("B");

        const fromA = [order(), order(), order()];
        for (const o of fromA) await A.db.orders.put(o);
        const fromB = order({ total_amount: 9 });
        await B.db.orders.put(fromB);

        connect(A, B);
        await sleep(200);

        for (const dev of [A, B]) {
            expect(await dev.db.orders.count()).toBe(4);
        }
        expect((await A.db.orders.get(fromB.id)).total_amount).toBe(9);
    });

    it("a record reaches a device that is not directly connected to its author", async () => {
        const A = makeDevice("A");
        const B = makeDevice("B");
        const C = makeDevice("C");
        connect(A, B);
        connect(B, C); // A and C cannot see each other

        const o = order({ total_amount: 12 });
        await A.db.orders.put(o);
        await sleep(150);

        expect((await C.db.orders.get(o.id))?.total_amount).toBe(12);
    });

    it("survives a device dropping out and coming back", async () => {
        const A = makeDevice("A");
        const B = makeDevice("B");
        connect(A, B);
        await sleep();
        disconnect(A, B);

        const o = order();
        await A.db.orders.put(o);
        await sleep();
        expect(await B.db.orders.get(o.id)).toBeUndefined();

        connect(A, B);
        await sleep(150);
        expect(await B.db.orders.get(o.id)).toBeDefined();
    });
});

// ----------------------------------------------------------------------
describe("safety", () => {
    it("rejects records that belong to a different shop", async () => {
        const A = makeDevice("A");
        const B = makeDevice("B");
        connect(A, B);
        const foreign = order({ shop_id: "some-other-shop" });
        const stamped = { ...foreign, _hlc: A.hlc.tick(), _origin: "A" };
        A.bus.send("B", { t: "recs", recs: [{ table: "orders", rec: stamped }] });
        await sleep();
        expect(await B.db.orders.get(foreign.id)).toBeUndefined();
    });

    it("ignores unknown tables and malformed records", async () => {
        const A = makeDevice("A");
        const B = makeDevice("B");
        connect(A, B);
        A.bus.send("B", {
            t: "recs",
            recs: [
                { table: "catalogs", rec: { id: "x", shop_id: SHOP } },
                { table: "orders", rec: null },
                { table: "orders", rec: { shop_id: SHOP } },
            ],
        });
        await sleep();
        expect(await B.db.catalogs.count()).toBe(0);
        expect(await B.db.orders.count()).toBe(0);
    });

    it("gives clocks to records created before replication existed, then replicates them", async () => {
        const A = makeDevice("A");
        const B = makeDevice("B");
        // legacy row written straight to storage, bypassing hooks
        const legacy = order();
        await A.db.orders.bulkPut([legacy]);
        // Strip the stamp the hooks just added (inside a mesh transaction so
        // the hook does not re-stamp it) to mimic a row from before this feature.
        await A.db.transaction("rw", A.db.orders, async () => {
            Dexie.currentTransaction.__mesh = true;
            await A.db.orders.where("id").equals(legacy.id).modify((r) => {
                delete r._hlc;
                delete r._origin;
            });
        });
        const raw = await A.db.orders.get(legacy.id);
        expect(raw._hlc).toBeUndefined();

        connect(A, B);
        await sleep(200);
        expect((await A.db.orders.get(legacy.id))._hlc).toBeTruthy();
        expect(await B.db.orders.get(legacy.id)).toBeDefined();
    });

    it("does not replicate local-only tables", async () => {
        const A = makeDevice("A");
        const B = makeDevice("B");
        connect(A, B);
        await A.db.catalogs.put({ shop_id: SHOP, menu: [1, 2, 3] });
        await A.db.stock_counts.put({ product_id: "p", quantity_total_base_units: 4 });
        await sleep();
        expect(await B.db.catalogs.count()).toBe(0);
        expect(await B.db.stock_counts.count()).toBe(0);
    });

    it("stop() removes the hooks", async () => {
        const A = makeDevice("A");
        const B = makeDevice("B");
        connect(A, B);
        A.rep.stop();
        const o = order();
        await A.db.orders.put(o);
        await sleep();
        expect((await A.db.orders.get(o.id))._hlc).toBeUndefined();
        expect(await B.db.orders.get(o.id)).toBeUndefined();
    });
});
