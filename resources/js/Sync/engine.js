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
    isKitchen: "terminal_is_kitchen",
    knownKitchens: "terminal_known_kitchens",
    isBar: "terminal_is_bar",
    knownBars: "terminal_known_bars",
    shopSettings: "terminal_shop_settings",
    routeBill: "terminal_route_bill",
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
        // This device has the kitchen printer. Items in kitchen categories are
        // sent here automatically from every device in the shop.
        isKitchen: storage.get(KEYS.isKitchen) === "1",
        // This device has the bar printer. When someone who is not working in
        // the bar rings up bar items, a slip prints here so the bar knows it
        // was rung up before anything leaves.
        isBar: storage.get(KEYS.isBar) === "1",
    };
    // Where bills print. Kitchen tickets need no setting: they go to every
    // device that says it is the kitchen.
    const routes = {
        bill: storage.get(KEYS.routeBill) || "",
    };

    const readJson = (key, fallback) => {
        try {
            const v = JSON.parse(storage.get(key));
            return v ?? fallback;
        } catch {
            return fallback;
        }
    };

    // Kitchen devices seen before, so an offline kitchen can be named in the
    // warning instead of just "no kitchen".
    let knownKitchens = readJson(KEYS.knownKitchens, []);
    if (!Array.isArray(knownKitchens)) knownKitchens = [];

    // Same for bar devices.
    let knownBars = readJson(KEYS.knownBars, []);
    if (!Array.isArray(knownBars)) knownBars = [];

    // Settings the server sends with every poll. The last value is kept so
    // devices behave the same when the server cannot be reached.
    // The category id lists are null until the server has been heard at least once.
    const savedSettings = readJson(KEYS.shopSettings, {});
    let shopSettings = {
        autoPrintReceipts: !!savedSettings.autoPrintReceipts,
        kitchenCategoryIds: Array.isArray(savedSettings.kitchenCategoryIds)
            ? savedSettings.kitchenCategoryIds
            : null,
        barCategoryIds: Array.isArray(savedSettings.barCategoryIds)
            ? savedSettings.barCategoryIds
            : null,
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
    let denied = false; // the server refused this device (logged out, wrong role)

    const getSnapshot = () => {
        if (snapshot && snapshot.version === version) return snapshot;
        snapshot = {
            version,
            deviceId,
            shopId,
            name: self.name,
            canPrint: self.canPrint,
            isKitchen: self.isKitchen,
            isBar: self.isBar,
            knownKitchens,
            knownBars,
            shopSettings,
            routes: { ...routes },
            peers: state.peers,
            status: state.status,
            denied,
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
        // Kitchen and bar devices accept jobs even if they were never marked as a bill printer.
        getSelf: () => ({ canPrint: self.canPrint || self.isKitchen || self.isBar }),
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
        // Keep the engine (and its explanation) on screen, but mark it unusable
        // so the next page load builds a fresh one after signing in again.
        onShopSettings: (raw) => applyShopSettings(raw),
        onAuthLost: () => {
            denied = true;
            touch();
        },
        ...meshOptions,
    });

    bus.onPeersChanged(() => {
        state.peers = bus.peers().map((p) => ({
            id: p.id,
            name: p.name,
            canPrint: !!p.canPrint,
            isKitchen: !!p.isKitchen,
            isBar: !!p.isBar,
        }));
        rememberStations(state.peers);
        touch();
    });

    // Keep a list of the devices that said they were a station (kitchen or
    // bar), dropping any that stopped being one.
    const updateStations = (list, peers, flag) => {
        const next = list.slice();
        for (const p of peers) {
            const at = next.findIndex((k) => k.id === p.id);
            if (p[flag]) {
                if (at === -1) next.push({ id: p.id, name: p.name });
                else if (next[at].name !== p.name) next[at] = { id: p.id, name: p.name };
            } else if (at !== -1) {
                next.splice(at, 1);
            }
        }
        return next;
    };

    function rememberStations(peers) {
        const kitchens = updateStations(knownKitchens, peers, "isKitchen");
        if (JSON.stringify(kitchens) !== JSON.stringify(knownKitchens)) {
            knownKitchens = kitchens;
            storage.set(KEYS.knownKitchens, JSON.stringify(knownKitchens));
        }
        const bars = updateStations(knownBars, peers, "isBar");
        if (JSON.stringify(bars) !== JSON.stringify(knownBars)) {
            knownBars = bars;
            storage.set(KEYS.knownBars, JSON.stringify(knownBars));
        }
    }

    function applyShopSettings(raw) {
        if (!raw || typeof raw !== "object") return;
        const next = {
            autoPrintReceipts:
                raw.auto_print_receipts === undefined
                    ? shopSettings.autoPrintReceipts
                    : !!raw.auto_print_receipts,
            kitchenCategoryIds: Array.isArray(raw.kitchen_category_ids)
                ? raw.kitchen_category_ids.map(String)
                : shopSettings.kitchenCategoryIds,
            barCategoryIds: Array.isArray(raw.bar_category_ids)
                ? raw.bar_category_ids.map(String)
                : shopSettings.barCategoryIds,
        };
        if (JSON.stringify(next) === JSON.stringify(shopSettings)) return;
        shopSettings = next;
        storage.set(KEYS.shopSettings, JSON.stringify(shopSettings));
        touch();
    }

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

        isStopped: () => stopped || denied,
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

        /** This device has the kitchen printer. Kitchen items from every device print here. */
        setKitchen(flag) {
            self.isKitchen = !!flag;
            storage.set(KEYS.isKitchen, self.isKitchen ? "1" : "0");
            mesh.announce();
            touch();
        },

        /** This device has the bar printer. Bar slips from every device print here. */
        setBar(flag) {
            self.isBar = !!flag;
            storage.set(KEYS.isBar, self.isBar ? "1" : "0");
            mesh.announce();
            touch();
        },

        /** kind: "bill". id: a device id, or "" for this device. */
        setRoute(kind, id) {
            if (kind !== "bill") return;
            routes.bill = id || "";
            storage.set(KEYS.routeBill, routes.bill);
            touch();
        },

        /** Apply settings in the server's shape, e.g. after a manager changes one. */
        applyShopSettings,

        /** The component that actually renders and prints on this device. */
        setPrintHost(host) {
            printHost = host;
        },

        sendPrint: (targetId, job) => printService.sendPrint(targetId, job),

        /** Everything needed to work out why devices are not linking. */
        getDiagnostics() {
            const g = globalThis;
            const mesh_ = mesh.getDiagnostics();
            return {
                when: new Date().toISOString(),
                device: {
                    id: deviceId,
                    name: self.name,
                    canPrint: self.canPrint,
                    isKitchen: self.isKitchen,
                    isBar: self.isBar,
                    shopId,
                },
                shopSettings,
                knownKitchens,
                knownBars,
                browser: {
                    userAgent: g.navigator?.userAgent,
                    secureContext: g.isSecureContext,
                    page: g.location?.origin,
                    hasRTCPeerConnection: typeof g.RTCPeerConnection !== "undefined",
                    online: g.navigator?.onLine,
                },
                linkedPeers: state.peers,
                routes: { ...routes },
                denied,
                status: mesh_.status,
                log: mesh_.log,
            };
        },
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
