// Sync/bus.js
//
// Transport-agnostic message bus. The replicator and the print service only
// ever talk to this, so they do not care whether a link is a WebRTC data
// channel or an in-memory pipe in a test.
//
// A "link" is { info, send(msg), close() } where info is { name, canPrint, ... }.

export function createBus(selfId) {
    const links = new Map(); // peerId -> link
    const handlers = new Map(); // type -> Set<fn(msg, peerId)>
    const upCbs = new Set();
    const downCbs = new Set();
    const changeCbs = new Set();

    const safe = (fn, ...args) => {
        try {
            return fn(...args);
        } catch (err) {
            console.error("[mesh] handler error:", err);
        }
    };

    return {
        selfId,

        attach(peerId, link) {
            links.set(peerId, link);
            upCbs.forEach((cb) => safe(cb, peerId, link.info));
            changeCbs.forEach((cb) => safe(cb));
        },

        detach(peerId) {
            if (links.delete(peerId)) {
                downCbs.forEach((cb) => safe(cb, peerId));
                changeCbs.forEach((cb) => safe(cb));
            }
        },

        /** Close a link and forget it (used when a peer fails verification). */
        kick(peerId) {
            const link = links.get(peerId);
            try {
                link?.close?.();
            } catch {
                /* already closed */
            }
            this.detach(peerId);
        },

        /** A peer renamed itself or toggled its printer flag. */
        updateInfo(peerId, patch) {
            const link = links.get(peerId);
            if (!link) return;
            link.info = { ...link.info, ...patch };
            changeCbs.forEach((cb) => safe(cb));
        },

        /** Called by a transport when a message arrives from a peer. */
        receive(peerId, msg) {
            if (!msg || typeof msg.t !== "string") return;
            handlers.get(msg.t)?.forEach((fn) => safe(fn, msg, peerId));
        },

        send(peerId, msg) {
            const link = links.get(peerId);
            if (!link) return false;
            link.send(msg);
            return true;
        },

        broadcast(msg, exceptPeerId = null) {
            links.forEach((link, id) => {
                if (id !== exceptPeerId) link.send(msg);
            });
        },

        on(type, fn) {
            if (!handlers.has(type)) handlers.set(type, new Set());
            handlers.get(type).add(fn);
            return () => handlers.get(type)?.delete(fn);
        },

        onPeerUp(cb) {
            upCbs.add(cb);
            return () => upCbs.delete(cb);
        },

        onPeerDown(cb) {
            downCbs.add(cb);
            return () => downCbs.delete(cb);
        },

        /** Fires whenever the set of verified peers, or their info, changes. */
        onPeersChanged(cb) {
            changeCbs.add(cb);
            return () => changeCbs.delete(cb);
        },

        has: (peerId) => links.has(peerId),
        peerIds: () => [...links.keys()],
        peers: () => [...links.entries()].map(([id, l]) => ({ id, ...l.info })),
    };
}
