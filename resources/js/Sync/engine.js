// Sync/engine.js
//
// Wires the pieces together for one device: identity, clock, replicator,
// WebRTC mesh and print service, plus the small amount of state the UI shows.
//
// createEngine() takes everything it touches as arguments so it can be tested
// without a browser. getEngine() is the app-facing singleton: it survives
// Inertia page changes, so moving between pages does not tear down the links.

import { createBus } from "./bus";
import { createHLC } from "./hlc";
import { createReplicator } from "./replicator";
import { createRTCMesh, createHttpSignaling } from "./rtc";
import { createPrintService } from "./print";

const KEYS = {
    deviceId: "terminal_device_id",
    name: "terminal_device_name",
    canPrint: "terminal_can_print",
    routeBill: "terminal_route_bill",
    routeKitchen: "terminal_route_kitchen",
    hlc: "mesh_hlc",
};

export const browserStorage = {
    get: (k) => {
        try {
            return globalThis.localStorage.getItem(k);
        } catch {
            return null;
        }
    },
    set: (k, v) => {
        try {
            globalThis.localStorage.setItem(k, v);
        } catch {
            /* private mode, quota */
        }
    },
};

const uuid = () => globalThis.crypto.randomUUID();

export function createEngine({
    shopId,
    db,
    storage = browserStorage,
    signaling,
    RTCPeerConnectionImpl,
    iceServers = [],
    getShiftId = () => storage.get("terminal_shift_id"),
    mesh: meshOptions = {},
    antiEntropyMs = 60_000,
}) {
    let deviceId = storage.get(KEYS.deviceId);
    if (!deviceId) {
        deviceId = uuid();
        storage.set(KEYS.deviceId, deviceId);
    }

    const self = {
        shopId,
        name: storage.get(KEYS.name) || `Device ${deviceId.slice(0, 4).toUpperCase()}`,
        canPrint: storage.get(KEYS.canPrint) === "1",
    };
    const routes = {
        bill: storage.get(KEYS.routeBill) || "",
        kitchen: storage.get(KEYS.routeKitchen) || "",
    };

    const state = {
        peers: [],
        status: { signaling: null, connecting: 0, open: 0, failed: [] },
    };
    const stateListeners = new Set();
    const eventListeners = new Set();
    let version = 0;
    let snapshot = null;
    let printHost = null;
    let stopped = false;

    const getSnapshot = () => {
        if (snapshot && snapshot.version === version) return snapshot;
        snapshot = {
            version,
            deviceId,
            shopId,
            name: self.name,
            canPrint: self.canPrint,
            routes: { ...routes },
            peers: state.peers,
            status: state.status,
        };
        return snapshot;
    };
    const touch = () => {
        version += 1;
        stateListeners.forEach((fn) => fn());
    };

    const bus = createBus(deviceId);
    const hlc = createHLC({
        deviceId,
        load: () => storage.get(KEYS.hlc),
        save: (s) => storage.set(KEYS.hlc, s),
    });

    const emitEvent = (e) => eventListeners.forEach((fn) => fn(e));

    const replicator = createReplicator({
        db,
        bus,
        hlc,
        deviceId,
        getContext: () => ({ shopId, shiftId: getShiftId() }),
        onEvent: (e) => {
            if (e.type === "error") console.error("[mesh] replication error", e.err);
            emitEvent(e);
        },
        antiEntropyMs,
    });

    const printService = createPrintService({
        bus,
        deviceId,
        getSelf: () => self,
        onJob: (job) =>
            printHost
                ? printHost.enqueue(job)
                : Promise.reject(new Error("The print screen is not open on that device")),
    });

    const mesh = createRTCMesh({
        bus,
        deviceId,
        getSelfInfo: () => self,
        // a function lets the caller build the client once the id is known
        signaling: typeof signaling === "function" ? signaling(deviceId) : signaling,
        RTCPeerConnectionImpl,
        iceServers,
        onStatus: (status) => {
            state.status = status;
            touch();
        },
        onAuthLost: () => engine.stop(),
        ...meshOptions,
    });

    bus.onPeersChanged(() => {
        state.peers = bus.peers().map((p) => ({
            id: p.id,
            name: p.name,
            canPrint: !!p.canPrint,
        }));
        touch();
    });

    const nameOf = (id) =>
        id === deviceId ? self.name : state.peers.find((p) => p.id === id)?.name || "that device";

    const engine = {
        deviceId,
        shopId,
        bus,
        replicator,

        start() {
            if (stopped) return;
            replicator.start();
            mesh.start();
        },

        stop() {
            if (stopped) return;
            stopped = true;
            mesh.stop();
            replicator.stop();
            printService.stop();
            stateListeners.clear();
            eventListeners.clear();
        },

        isStopped: () => stopped,
        getSnapshot,
        subscribe(fn) {
            stateListeners.add(fn);
            return () => stateListeners.delete(fn);
        },
        onEvent(fn) {
            eventListeners.add(fn);
            return () => eventListeners.delete(fn);
        },

        setName(name) {
            self.name = (name || "").trim().slice(0, 40) || self.name;
            storage.set(KEYS.name, self.name);
            mesh.announce();
            touch();
        },

        setCanPrint(flag) {
            self.canPrint = !!flag;
            storage.set(KEYS.canPrint, self.canPrint ? "1" : "0");
            mesh.announce();
            touch();
        },

        /** kind: "bill" | "kitchen". id: a device id, or "" (this device / off). */
        setRoute(kind, id) {
            if (kind !== "bill" && kind !== "kitchen") return;
            routes[kind] = id || "";
            storage.set(kind === "bill" ? KEYS.routeBill : KEYS.routeKitchen, routes[kind]);
            touch();
        },

        /** The component that actually renders and prints on this device. */
        setPrintHost(host) {
            printHost = host;
        },

        sendPrint: (targetId, job) => printService.sendPrint(targetId, job),
        nameOf,
        syncNow: () => replicator.syncNow(),
    };

    return engine;
}

// ----------------------------------------------------------------------
// App singleton
// ----------------------------------------------------------------------

let current = null; // { key, engine }

export function getEngine({ shopId, db }) {
    const key = String(shopId);
    if (current && current.key === key && !current.engine.isStopped()) return current.engine;
    if (current) current.engine.stop();

    const engine = createEngine({
        shopId,
        db,
        signaling: (deviceId) => createHttpSignaling({ deviceId }),
        RTCPeerConnectionImpl: globalThis.RTCPeerConnection,
        // Empty = LAN only. Set window.__MESH_ICE_SERVERS__ to add STUN/TURN.
        iceServers: globalThis.__MESH_ICE_SERVERS__ || [],
    });
    current = { key, engine };
    engine.start();

    // Let the server drop this device straight away when the tab closes.
    globalThis.addEventListener?.("pagehide", () => engine.stop(), { once: true });
    return engine;
}

export function stopEngine() {
    current?.engine.stop();
    current = null;
}
