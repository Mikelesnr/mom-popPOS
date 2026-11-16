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
    return (deviceId) => ({
        async poll(self) {
            devices.set(deviceId, { device_id: deviceId, name: self.name, can_print: self.can_print });
            if (!mail.has(deviceId)) mail.set(deviceId, []);
            return {
                peers: [...devices.values()].filter((d) => d.device_id !== deviceId),
                messages: mail.get(deviceId).splice(0),
            };
        },
        async send(m) {
            mail.get(m.to)?.push({ from: deviceId, type: m.type, sid: m.sid, payload: m.payload });
        },
        leave() {
            devices.delete(deviceId);
        },
    });
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
});
