// Real WebRTC test: devices find each other through a fake signaling server
// (same contract as the Laravel endpoints), open actual data channels over
// loopback, and replicate through them.
//
// Needs the Node WebRTC polyfill:  npm install --no-save node-datachannel

import "fake-indexeddb/auto";
import Dexie from "dexie";
import { RTCPeerConnection } from "node-datachannel/polyfill";
import { createBus } from "../../../resources/js/Sync/bus";
import { createHLC } from "../../../resources/js/Sync/hlc";
import { createReplicator } from "../../../resources/js/Sync/replicator";
import { createRTCMesh } from "../../../resources/js/Sync/rtc";

const SHIFT = "shift-1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 10_000, label = "condition") {
    const t0 = Date.now();
    for (;;) {
        if (await fn()) return;
        if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${label}`);
        await sleep(40);
    }
}

// Same behaviour as DeviceSignalController: presence list + per-device mailbox.
// What Laravel's TrimStrings + ConvertEmptyStringsToNull do to a JSON body.
const laravelClean = (v) =>
    typeof v === "string"
        ? v.trim() === ""
            ? null
            : v.trim()
        : Array.isArray(v)
          ? v.map(laravelClean)
          : v && typeof v === "object"
            ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, laravelClean(x)]))
            : v;

function makeSignalServer() {
    const shops = new Map();
    const state = { down: false, clean: false, drop: new Set(), iceServers: undefined };
    const shop = (id) => {
        if (!shops.has(id)) shops.set(id, { devices: new Map(), mail: new Map() });
        return shops.get(id);
    };
    return {
        state,
        clientFor(shopId, deviceId) {
            const guard = () => {
                if (state.down) throw new Error("signaling 503");
            };
            return {
                async poll(self) {
                    guard();
                    const s = shop(shopId);
                    s.devices.set(deviceId, { device_id: deviceId, name: self.name, can_print: self.can_print });
                    if (!s.mail.has(deviceId)) s.mail.set(deviceId, []);
                    const peers = [...s.devices.values()].filter((d) => d.device_id !== deviceId);
                    const res = { peers, messages: s.mail.get(deviceId).splice(0) };
                    if (state.iceServers) res.ice_servers = state.iceServers;
                    return res;
                },
                async send(msg) {
                    guard();
                    const s = shop(shopId);
                    if (!s.devices.has(msg.to)) throw new Error("unknown peer");
                    if (state.drop.has(msg.type)) return;
                    const payload = state.clean ? laravelClean(msg.payload) : msg.payload;
                    s.mail.get(msg.to)?.push({ from: deviceId, type: msg.type, sid: msg.sid, payload });
                },
                leave() {
                    shop(shopId).devices.delete(deviceId);
                },
            };
        },
    };
}

let n = 0;
function makeNode(id, shopId, server, { canPrint = false, mesh: meshOpts = {}, RTC = RTCPeerConnection } = {}) {
    const db = new Dexie(`rtc-test-${++n}-${Math.random()}`);
    db.version(11).stores({
        orders: "id, shop_id, shift_id, user_id, status, created_at, synced_at",
        open_tables: "id, shop_id, shift_id, user_id, status, created_at, synced_at",
        order_items: "id, orderable_id, product_id, placed, synced_at, metadata",
        users: "id, name, role",
    });
    const bus = createBus(id);
    const hlc = createHLC({ deviceId: id.padEnd(8, "0") });
    const rep = createReplicator({
        db,
        bus,
        hlc,
        deviceId: id,
        getContext: () => ({ shopId, shiftId: SHIFT }),
        antiEntropyMs: 0,
    });
    const self = { name: `dev-${id}`, canPrint, shopId };
    const mesh = createRTCMesh({
        bus,
        deviceId: id,
        getSelfInfo: () => self,
        signaling: server.clientFor(shopId, id),
        RTCPeerConnectionImpl: RTC,
        pollMs: 60,
        idlePollMs: 120,
        pingMs: 250,
        deadAfterMs: 1500,
        ...meshOpts,
    });
    rep.start();
    mesh.start();
    return { id, db, bus, rep, mesh, self, stop: () => (rep.stop(), mesh.stop()) };
}

const order = (shopId, over = {}) => ({
    id: crypto.randomUUID(),
    shop_id: shopId,
    shift_id: SHIFT,
    user_id: "u1",
    total_amount: 7,
    status: "paid",
    created_at: new Date().toISOString(),
    synced_at: null,
    ...over,
});

const nodes = [];
afterEach(() => {
    nodes.splice(0).forEach((x) => x.stop());
});
const mk = (...a) => {
    const node = makeNode(...a);
    nodes.push(node);
    return node;
};

describe("WebRTC mesh over real data channels", () => {
    it("two devices that start at the same moment end up with exactly one working link", async () => {
        const server = makeSignalServer();
        const A = mk("aaaa1111", "shop-1", server);
        const B = mk("bbbb2222", "shop-1", server);

        await waitFor(() => A.bus.peerIds().length === 1 && B.bus.peerIds().length === 1, 12_000, "link up");
        expect(A.bus.peers()[0].name).toBe("dev-bbbb2222");

        const o = order("shop-1");
        await A.db.orders.put(o);
        await waitFor(async () => !!(await B.db.orders.get(o.id)), 6000, "order on B");
        expect((await B.db.orders.get(o.id)).total_amount).toBe(7);
    }, 30_000);

    it("a third device joins the mesh and receives what it missed", async () => {
        const server = makeSignalServer();
        const A = mk("aaaa1111", "shop-1", server);
        const B = mk("bbbb2222", "shop-1", server);
        await waitFor(() => A.bus.peerIds().length === 1, 12_000, "A-B");

        const o = order("shop-1", { total_amount: 21 });
        await A.db.orders.put(o);

        const C = mk("cccc3333", "shop-1", server);
        await waitFor(() => C.bus.peerIds().length === 2, 15_000, "C joins both");
        await waitFor(async () => !!(await C.db.orders.get(o.id)), 8000, "order on C");
    }, 40_000);

    it("replication keeps working after the signaling server (internet) goes down", async () => {
        const server = makeSignalServer();
        const A = mk("aaaa1111", "shop-1", server);
        const B = mk("bbbb2222", "shop-1", server);
        await waitFor(() => A.bus.peerIds().length === 1 && B.bus.peerIds().length === 1, 12_000, "link up");

        server.state.down = true;
        await sleep(400); // a few failed polls

        const o = order("shop-1", { total_amount: 33 });
        await B.db.orders.put(o);
        await waitFor(async () => !!(await A.db.orders.get(o.id)), 6000, "order on A while offline");
        expect(A.mesh.status().signaling).toBe(false);
        expect(A.bus.peerIds().length).toBe(1);
    }, 30_000);

    it("refuses to link a device whose handshake claims a different shop", async () => {
        // Even if signaling wrongly pairs them (here both are registered under
        // shop-1), the handshake itself must stop data crossing shops.
        const server = makeSignalServer();
        const A = mk("aaaa1111", "shop-1", server);
        const intruder = mk("cccc3333", "shop-1", server);
        intruder.self.shopId = "shop-2"; // what it announces in its hello

        await sleep(2500);
        expect(A.bus.peerIds()).toEqual([]);
        expect(intruder.bus.peerIds()).toEqual([]);

        await A.db.orders.put(order("shop-1"));
        await sleep(300);
        expect(await intruder.db.orders.count()).toBe(0);
    }, 20_000);

    it("a device that restarts reconnects and catches up", async () => {
        const server = makeSignalServer();
        const A = mk("aaaa1111", "shop-1", server);
        const B1 = mk("bbbb2222", "shop-1", server);
        await waitFor(() => A.bus.peerIds().length === 1, 12_000, "initial link");

        const o1 = order("shop-1");
        await A.db.orders.put(o1);
        await waitFor(async () => !!(await B1.db.orders.get(o1.id)), 6000, "o1 on B");

        // B goes away (battery died); A keeps trading
        B1.stop();
        await waitFor(() => A.bus.peerIds().length === 0, 8000, "A notices B is gone");
        const o2 = order("shop-1", { total_amount: 50 });
        await A.db.orders.put(o2);

        // B comes back (new page load: same device id, fresh session)
        B1.db.close();
        const B2 = mk("bbbb2222", "shop-1", server);
        await waitFor(() => A.bus.peerIds().length === 1 && B2.bus.peerIds().length === 1, 15_000, "relink");
        await waitFor(async () => !!(await B2.db.orders.get(o2.id)), 8000, "B catches up");
        expect((await B2.db.orders.get(o2.id)).total_amount).toBe(50);
    }, 45_000);

    it("still connects when the server trims whitespace and nulls empty strings like Laravel does", async () => {
        const server = makeSignalServer();
        server.state.clean = true;
        const A = mk("aaaa1111", "shop-1", server);
        const B = mk("bbbb2222", "shop-1", server);
        await waitFor(() => A.bus.peerIds().length === 1 && B.bus.peerIds().length === 1, 12_000, "link up");
        const o = order("shop-1", { total_amount: 4 });
        await A.db.orders.put(o);
        await waitFor(async () => !!(await B.db.orders.get(o.id)), 6000, "order on B");
    }, 30_000);

    it("records each stage in a diagnostic log and lists devices the server can see", async () => {
        const server = makeSignalServer();
        const A = mk("aaaa1111", "shop-1", server);
        const B = mk("bbbb2222", "shop-1", server);
        await waitFor(() => A.bus.peerIds().length === 1, 12_000, "link up");

        const diag = A.mesh.getDiagnostics();
        const kinds = diag.log.map((e) => e.kind);
        expect(kinds).toEqual(expect.arrayContaining(["server reachable", "devices online", "making offer", "link up"]));
        expect(diag.status.online.map((d) => d.id)).toEqual(["bbbb2222"]);
        const c = diag.status.connections.find((x) => x.id === "bbbb2222");
        expect(c.state).toBe("open");
        expect(c.local.host + c.local.mdns).toBeGreaterThan(0); // we gathered local candidates
        void B;
    }, 30_000);

    it("uses the ICE servers the server hands out for new connections", async () => {
        const configs = [];
        class SpyRTC extends RTCPeerConnection {
            constructor(cfg) {
                super(cfg);
                configs.push(cfg);
            }
        }
        const server = makeSignalServer();
        server.state.iceServers = [{ urls: ["stun:stun.example.org:3478"] }];
        const A = mk("aaaa1111", "shop-1", server, { RTC: SpyRTC });
        const B = mk("bbbb2222", "shop-1", server);
        await waitFor(() => A.bus.peerIds().length === 1, 12_000, "link up");
        expect(configs.length).toBeGreaterThan(0);
        expect(configs[0].iceServers).toEqual([{ urls: ["stun:stun.example.org:3478"] }]);
        expect(A.mesh.status().iceServers).toEqual([["stun:stun.example.org:3478"]]);
        void B;
    }, 30_000);

    it("explains a connection that never completes instead of failing silently", async () => {
        const server = makeSignalServer();
        server.state.drop.add("answer"); // the offer arrives, the answer never gets back
        const A = mk("aaaa1111", "shop-1", server, { mesh: { connectTimeoutMs: 1200 } });
        const B = mk("bbbb2222", "shop-1", server);
        await waitFor(() => A.mesh.status().failed.length > 0, 8000, "A reports a failure");

        const st = A.mesh.status();
        expect(st.online.map((d) => d.id)).toEqual(["bbbb2222"]); // seen by the server
        expect(st.failed[0].reason).toMatch(/timed out waiting for the other device/);
        expect(st.connections[0].lastFailure.reason).toMatch(/host 1/); // includes what was gathered
        expect(A.bus.peerIds()).toEqual([]);

        // the reason survives the retry that follows
        await waitFor(() => (A.mesh.status().connections[0]?.attempts || 0) >= 2, 8000, "a second attempt");
        expect(A.mesh.status().connections[0].lastFailure.reason).toMatch(/timed out/);
        void B;
    }, 20_000);

    it("says so when the browser has no WebRTC instead of throwing", async () => {
        const server = makeSignalServer();
        const A = mk("aaaa1111", "shop-1", server, { RTC: null });
        const B = mk("bbbb2222", "shop-1", server, { RTC: null });
        await waitFor(() => A.mesh.status().online.length === 1, 5000, "sees the other device");
        expect(A.mesh.status().webrtcUnsupported).toBe(true);
        expect(A.mesh.status().connections).toEqual([]);
        void B;
    }, 15_000);
});
