// End to end: two full engines (identity, replication, WebRTC, printing)
// talking over real data channels through a fake signaling server.
// Needs: npm install --no-save node-datachannel

import "fake-indexeddb/auto";
import Dexie from "dexie";
import { RTCPeerConnection } from "node-datachannel/polyfill";
import { createEngine } from "../../../resources/js/Sync/engine";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 10_000, label = "condition") {
    const t0 = Date.now();
    for (;;) {
        if (await fn()) return;
        if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${label}`);
        await sleep(40);
    }
}

function signalServer() {
    const mail = new Map();
    const devices = new Map();
    const factory = (deviceId) => ({
        async poll(self) {
            devices.set(deviceId, {
                device_id: deviceId,
                name: self.name,
                can_print: self.can_print,
                is_kitchen: self.is_kitchen,
                is_bar: self.is_bar,
            });
            if (!mail.has(deviceId)) mail.set(deviceId, []);
            const res = {
                peers: [...devices.values()].filter((d) => d.device_id !== deviceId),
                messages: mail.get(deviceId).splice(0),
            };
            if (factory.settings) res.shop_settings = factory.settings;
            return res;
        },
        async send(m) {
            mail.get(m.to)?.push({ from: deviceId, type: m.type, sid: m.sid, payload: m.payload });
        },
        leave() {
            devices.delete(deviceId);
        },
    });
    factory.settings = null; // what the server returns as shop_settings
    factory.forget = (deviceId) => devices.delete(deviceId);
    return factory;
}

const memoryStorage = (init = {}) => {
    const m = new Map(Object.entries(init));
    return { get: (k) => m.get(k) ?? null, set: (k, v) => m.set(k, String(v)) };
};

let n = 0;
function device(id, server, extra = {}) {
    const db = new Dexie(`engine-${++n}-${Math.random()}`);
    db.version(11).stores({
        orders: "id, shop_id, shift_id, user_id, status, created_at, synced_at",
        open_tables: "id, shop_id, shift_id, user_id, status, created_at, synced_at",
        order_items: "id, orderable_id, product_id, placed, synced_at, metadata",
        users: "id, name, role",
    });
    const engine = createEngine({
        shopId: "shop-1",
        db,
        storage: memoryStorage({ terminal_device_id: id, terminal_shift_id: "shift-1", ...extra }),
        signaling: server(id),
        RTCPeerConnectionImpl: RTCPeerConnection,
        mesh: { pollMs: 60, idlePollMs: 120, pingMs: 300, deadAfterMs: 2000 },
        antiEntropyMs: 0,
    });
    engine.start();
    return { id, db, engine };
}

const engines = [];
afterEach(() => engines.splice(0).forEach((d) => d.engine.stop()));
const mk = (...a) => {
    const d = device(...a);
    engines.push(d);
    return d;
};

describe("engine", () => {
    it("renaming a device and marking it as a printer is seen by the others", async () => {
        const server = signalServer();
        const bar = mk("aaaa1111-0000-4000-8000-000000000001", server);
        const kitchen = mk("bbbb2222-0000-4000-8000-000000000002", server);
        await waitFor(() => bar.engine.getSnapshot().peers.length === 1, 12_000, "linked");

        kitchen.engine.setName("Kitchen");
        kitchen.engine.setCanPrint(true);
        await waitFor(() => {
            const p = bar.engine.getSnapshot().peers[0];
            return p?.name === "Kitchen" && p.canPrint === true;
        }, 6000, "bar sees Kitchen as a printer");
    }, 30_000);

    it("a kitchen ticket sent from the bar prints on the kitchen device", async () => {
        const server = signalServer();
        const bar = mk("aaaa1111-0000-4000-8000-000000000001", server);
        const kitchen = mk("bbbb2222-0000-4000-8000-000000000002", server, { terminal_can_print: "1" });
        const printed = [];
        kitchen.engine.setPrintHost({ enqueue: async (job) => printed.push(job) });
        await waitFor(() => bar.engine.getSnapshot().peers.length === 1, 12_000, "linked");

        await bar.engine.sendPrint(kitchen.id, { template: "kitchen", props: { tableName: "T4" } });
        expect(printed).toEqual([{ template: "kitchen", props: { tableName: "T4" } }]);
    }, 30_000);

    it("a manager on another device sees tables opened at the bar, and is warned about items rung after payment", async () => {
        const server = signalServer();
        const bar = mk("aaaa1111-0000-4000-8000-000000000001", server);
        const mgr = mk("bbbb2222-0000-4000-8000-000000000002", server);
        const warnings = [];
        mgr.engine.onEvent((e) => e.type === "anomaly" && warnings.push(e));
        await waitFor(() => bar.engine.getSnapshot().peers.length === 1, 12_000, "linked");

        const t = {
            id: crypto.randomUUID(), shop_id: "shop-1", shift_id: "shift-1", user_id: "u",
            name: "Window", total_amount: 0, status: "open",
            created_at: new Date().toISOString(), synced_at: null,
        };
        await bar.db.open_tables.put(t);
        await waitFor(async () => !!(await mgr.db.open_tables.get(t.id)), 6000, "table on manager");

        // the manager takes payment and closes it
        await mgr.db.open_tables.update(t.id, { status: "closed" });
        await waitFor(async () => (await bar.db.open_tables.get(t.id)).status === "closed", 6000, "closed on bar");

        // the bar, now aware it is closed, still rings another item onto it
        await sleep(20);
        await bar.db.order_items.put({
            id: crypto.randomUUID(), orderable_id: t.id, product_id: "p", name: "One more",
            quantity: 1, unit_price: 2, subtotal: 2, placed: 1, synced_at: null,
        });
        await waitFor(() => warnings.length > 0, 6000, "manager warned");
        expect(warnings[0]).toMatchObject({ kind: "item_after_close", tableName: "Window", itemName: "One more" });
    }, 30_000);

    it("stops itself when the server says the session is over", async () => {
        const deadSignaling = () => ({
            poll: async () => {
                const e = new Error("signaling 419");
                e.status = 419;
                throw e;
            },
            send: async () => {},
            leave() {},
        });
        const db = new Dexie(`engine-dead-${Math.random()}`);
        db.version(11).stores({ orders: "id", open_tables: "id", order_items: "id", users: "id" });
        const engine = createEngine({
            shopId: "shop-1", db, storage: memoryStorage(), signaling: deadSignaling(),
            RTCPeerConnectionImpl: RTCPeerConnection, mesh: { pollMs: 30 }, antiEntropyMs: 0,
        });
        engine.start();
        await waitFor(() => engine.isStopped(), 3000, "engine stopped itself");

        // and it says why, instead of just going quiet
        const snap = engine.getSnapshot();
        expect(snap.denied).toBe(true);
        expect(snap.status.signaling).toBe("denied");
        expect(snap.status.httpStatus).toBe(419);
        const diag = engine.getDiagnostics();
        expect(diag.denied).toBe(true);
        expect(diag.log.some((e) => e.kind === "server refused this device")).toBe(true);
    });

    it("diagnostics describe the device, the browser and what happened", async () => {
        const server = signalServer();
        const a = mk("aaaa1111-0000-4000-8000-000000000001", server);
        const b = mk("bbbb2222-0000-4000-8000-000000000002", server);
        await waitFor(() => a.engine.getSnapshot().peers.length === 1, 12_000, "linked");
        const d = a.engine.getDiagnostics();
        expect(d.device).toMatchObject({ id: "aaaa1111-0000-4000-8000-000000000001", shopId: "shop-1" });
        expect(d.browser).toHaveProperty("hasRTCPeerConnection");
        expect(d.linkedPeers.length).toBe(1);
        expect(d.log.some((e) => e.kind === "link up")).toBe(true);
        void b;
    }, 30_000);

    it("the kitchen flag reaches the other device over the real link, and is remembered after the kitchen goes away", async () => {
        const server = signalServer();
        const bar = mk("aaaa1111-0000-4000-8000-000000000001", server);
        const kitchen = mk("bbbb2222-0000-4000-8000-000000000002", server);
        await waitFor(() => bar.engine.getSnapshot().peers.length === 1, 12_000, "linked");
        expect(bar.engine.getSnapshot().peers[0].isKitchen).toBe(false);

        kitchen.engine.setName("Kitchen");
        kitchen.engine.setKitchen(true);
        await waitFor(() => bar.engine.getSnapshot().peers[0]?.isKitchen === true, 6000, "bar sees the kitchen");
        expect(bar.engine.getSnapshot().knownKitchens).toEqual([
            { id: "bbbb2222-0000-4000-8000-000000000002", name: "Kitchen" },
        ]);

        // the kitchen device is switched off: it is gone from the peers but remembered
        kitchen.engine.stop();
        server.forget("bbbb2222-0000-4000-8000-000000000002");
        await waitFor(() => bar.engine.getSnapshot().peers.length === 0, 8000, "kitchen gone");
        expect(bar.engine.getSnapshot().knownKitchens.map((k) => k.name)).toEqual(["Kitchen"]);

        // and it shows up in the diagnostics too
        expect(bar.engine.getDiagnostics().knownKitchens.length).toBe(1);
    }, 40_000);

    it("a device that stops being the kitchen is forgotten", async () => {
        const server = signalServer();
        const bar = mk("aaaa1111-0000-4000-8000-000000000001", server);
        const kitchen = mk("bbbb2222-0000-4000-8000-000000000002", server);
        await waitFor(() => bar.engine.getSnapshot().peers.length === 1, 12_000, "linked");
        kitchen.engine.setKitchen(true);
        await waitFor(() => bar.engine.getSnapshot().knownKitchens.length === 1, 6000, "known");
        kitchen.engine.setKitchen(false);
        await waitFor(() => bar.engine.getSnapshot().knownKitchens.length === 0, 6000, "forgotten");
    }, 30_000);

    it("a kitchen device takes print jobs even though it was never marked as a bill printer", async () => {
        const server = signalServer();
        const bar = mk("aaaa1111-0000-4000-8000-000000000001", server);
        const kitchen = mk("bbbb2222-0000-4000-8000-000000000002", server);
        const printed = [];
        kitchen.engine.setPrintHost({ enqueue: async (job) => printed.push(job) });
        kitchen.engine.setKitchen(true); // canPrint stays false
        await waitFor(() => bar.engine.getSnapshot().peers[0]?.isKitchen === true, 12_000, "kitchen seen");
        expect(bar.engine.getSnapshot().peers[0].canPrint).toBe(false);

        await bar.engine.sendPrint(kitchen.id, { template: "kitchen", props: { tableName: "T4" } });
        expect(printed.length).toBe(1);
    }, 30_000);

    it("a device that is neither a printer nor the kitchen still refuses print jobs", async () => {
        const server = signalServer();
        const bar = mk("aaaa1111-0000-4000-8000-000000000001", server);
        const other = mk("bbbb2222-0000-4000-8000-000000000002", server);
        await waitFor(() => bar.engine.getSnapshot().peers.length === 1, 12_000, "linked");
        await expect(bar.engine.sendPrint(other.id, { template: "kitchen", props: {} })).rejects.toThrow(/not set up as a printer/);
    }, 30_000);

    it("applies the print settings the server returns with each poll, and keeps them", async () => {
        const server = signalServer();
        server.settings = { auto_print_receipts: true, kitchen_category_ids: [7, "c2"] };
        const a = mk("aaaa1111-0000-4000-8000-000000000001", server);
        await waitFor(() => a.engine.getSnapshot().shopSettings.autoPrintReceipts === true, 6000, "settings applied");
        expect(a.engine.getSnapshot().shopSettings.kitchenCategoryIds).toEqual(["7", "c2"]); // ids compared as text
        expect(a.engine.getDiagnostics().shopSettings.autoPrintReceipts).toBe(true);

        // a manager turns it off; the next poll brings that to the device
        server.settings = { auto_print_receipts: false, kitchen_category_ids: ["c2"] };
        await waitFor(() => a.engine.getSnapshot().shopSettings.autoPrintReceipts === false, 8000, "change applied");
        expect(a.engine.getSnapshot().shopSettings.kitchenCategoryIds).toEqual(["c2"]);
    }, 30_000);

    it("starts from the last settings it saw, before the server has answered", async () => {
        const server = signalServer();
        const stored = { terminal_shop_settings: JSON.stringify({ autoPrintReceipts: true, kitchenCategoryIds: ["c9"] }), terminal_known_kitchens: JSON.stringify([{ id: "k", name: "Pass" }]) };
        const a = mk("aaaa1111-0000-4000-8000-000000000001", server, stored);
        const snap = a.engine.getSnapshot();
        expect(snap.shopSettings).toEqual({ autoPrintReceipts: true, kitchenCategoryIds: ["c9"], barCategoryIds: null });
        expect(snap.knownKitchens).toEqual([{ id: "k", name: "Pass" }]);
    });

    it("kitchen tickets no longer need a chosen printer, and the old setting is ignored", async () => {
        const server = signalServer();
        const a = mk("aaaa1111-0000-4000-8000-000000000001", server, { terminal_route_kitchen: "some-old-device" });
        a.engine.setRoute("kitchen", "x"); // no longer a route
        expect(a.engine.getSnapshot().routes).toEqual({ bill: "" });
        a.engine.setRoute("bill", "dev-1");
        expect(a.engine.getSnapshot().routes.bill).toBe("dev-1");
    });

    it("the bar flag reaches the other device over the real link, is remembered, and is forgotten when switched off", async () => {
        const server = signalServer();
        const waiter = mk("aaaa1111-0000-4000-8000-000000000001", server);
        const bar = mk("bbbb2222-0000-4000-8000-000000000002", server);
        await waitFor(() => waiter.engine.getSnapshot().peers.length === 1, 12_000, "linked");
        expect(waiter.engine.getSnapshot().peers[0].isBar).toBe(false);

        bar.engine.setName("Main bar");
        bar.engine.setBar(true);
        await waitFor(() => waiter.engine.getSnapshot().peers[0]?.isBar === true, 6000, "waiter sees the bar");
        expect(waiter.engine.getSnapshot().peers[0].isKitchen).toBe(false);
        expect(waiter.engine.getSnapshot().knownBars).toEqual([{ id: "bbbb2222-0000-4000-8000-000000000002", name: "Main bar" }]);
        expect(waiter.engine.getSnapshot().knownKitchens).toEqual([]);

        bar.engine.setBar(false);
        await waitFor(() => waiter.engine.getSnapshot().knownBars.length === 0, 6000, "forgotten");
    }, 40_000);

    it("a device can be the kitchen and the bar at once, and each list is kept separately", async () => {
        const server = signalServer();
        const a = mk("aaaa1111-0000-4000-8000-000000000001", server);
        const both = mk("bbbb2222-0000-4000-8000-000000000002", server);
        await waitFor(() => a.engine.getSnapshot().peers.length === 1, 12_000, "linked");
        both.engine.setKitchen(true);
        both.engine.setBar(true);
        await waitFor(() => a.engine.getSnapshot().knownBars.length === 1 && a.engine.getSnapshot().knownKitchens.length === 1, 6000, "both known");
        both.engine.setKitchen(false);
        await waitFor(() => a.engine.getSnapshot().knownKitchens.length === 0, 6000, "kitchen dropped");
        expect(a.engine.getSnapshot().knownBars.length).toBe(1);
    }, 30_000);

    it("a bar device takes print jobs even though it was never marked as a bill printer", async () => {
        const server = signalServer();
        const waiter = mk("aaaa1111-0000-4000-8000-000000000001", server);
        const bar = mk("bbbb2222-0000-4000-8000-000000000002", server);
        const printed = [];
        bar.engine.setPrintHost({ enqueue: async (job) => printed.push(job) });
        bar.engine.setBar(true); // canPrint stays false
        await waitFor(() => waiter.engine.getSnapshot().peers[0]?.isBar === true, 12_000, "bar seen");
        expect(waiter.engine.getSnapshot().peers[0].canPrint).toBe(false);
        await waiter.engine.sendPrint(bar.id, { template: "bar", props: { tableName: "T4" } });
        expect(printed.length).toBe(1);
    }, 30_000);

    it("applies the bar category list from the server with the other settings", async () => {
        const server = signalServer();
        server.settings = { auto_print_receipts: false, kitchen_category_ids: ["k1"], bar_category_ids: [3, "b2"] };
        const a = mk("aaaa1111-0000-4000-8000-000000000001", server);
        await waitFor(() => a.engine.getSnapshot().shopSettings.barCategoryIds?.length === 2, 6000, "applied");
        expect(a.engine.getSnapshot().shopSettings.barCategoryIds).toEqual(["3", "b2"]);
        expect(a.engine.getSnapshot().shopSettings.kitchenCategoryIds).toEqual(["k1"]);
    }, 20_000);

    it("restores the bar flag and known bars after a reload", async () => {
        const server = signalServer();
        const a = mk("aaaa1111-0000-4000-8000-000000000001", server, {
            terminal_is_bar: "1",
            terminal_known_bars: JSON.stringify([{ id: "b", name: "Cellar" }]),
        });
        expect(a.engine.getSnapshot().isBar).toBe(true);
        expect(a.engine.getSnapshot().knownBars).toEqual([{ id: "b", name: "Cellar" }]);
    });
});
