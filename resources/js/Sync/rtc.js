// Sync/rtc.js
//
// Connects this device to every other device in the same shop with WebRTC
// data channels (a full mesh), and feeds verified links into the bus.
//
// The server is only a switchboard. It lists which devices are online and
// passes the connection setup messages (offer / answer / ice) between them.
// Once two devices have a channel, their data flows directly over the shop's
// Wi-Fi and keeps working if the internet drops. Losing the internet only
// stops NEW connections from being set up.
//
// Glare: when two devices notice each other at the same time, the one with
// the smaller device id makes the offer, so they never both offer at once.
//
// Everything that happens is also written to a small diagnostic log
// (getDiagnostics) so "it does not connect" can be traced to a stage:
// server not reachable, device not seen, offer not answered, or ICE failing.

import { encodeFrames, createReassembler } from "./framing";

const randomId = () =>
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);

const emptyCounts = () => ({ host: 0, srflx: 0, relay: 0, prflx: 0, mdns: 0 });

/** "candidate:1 1 udp 2113937151 abcd.local 54321 typ host" -> { type, mdns } */
export function classifyCandidate(str) {
    const s = typeof str === "string" ? str : "";
    const type = /\styp\s(\w+)/.exec(s)?.[1] || "unknown";
    const addr = s.split(" ")[4] || "";
    return { type, mdns: addr.endsWith(".local") };
}

const count = (counts, c) => {
    if (counts[c.type] !== undefined) counts[c.type] += 1;
    if (c.mdns) counts.mdns += 1;
};

// Setup payloads travel as JSON strings. They used to travel as objects, and
// the server's whitespace trimming silently cut the trailing line break off
// every SDP. A JSON string starts and ends with a brace, so it passes
// through untouched. Objects are still accepted.
const parsePayload = (p) => {
    if (typeof p !== "string") return p;
    try {
        return JSON.parse(p);
    } catch {
        return null;
    }
};

async function describePath(pc) {
    try {
        if (typeof pc.getStats !== "function") return null;
        const stats = await pc.getStats();
        const byId = {};
        stats.forEach((r) => (byId[r.id] = r));
        let pair = null;
        stats.forEach((r) => {
            if (r.type === "transport" && r.selectedCandidatePairId) pair = byId[r.selectedCandidatePairId];
        });
        if (!pair) {
            stats.forEach((r) => {
                if (r.type === "candidate-pair" && r.nominated && r.state === "succeeded") pair = r;
            });
        }
        if (!pair) return null;
        const l = byId[pair.localCandidateId];
        const r = byId[pair.remoteCandidateId];
        return `${l?.candidateType || "?"}/${r?.candidateType || "?"}`;
    } catch {
        return null;
    }
}

export function createRTCMesh({
    bus,
    deviceId,
    getSelfInfo, // () => ({ name, canPrint, isKitchen, isBar, shopId })
    signaling, // { poll(self) -> { peers, messages, ice_servers? }, send(msg), leave?() }
    RTCPeerConnectionImpl = globalThis.RTCPeerConnection,
    iceServers = [], // extra servers; the server can add more (STUN/TURN) in poll()
    pollMs = 2000,
    idlePollMs = 6000,
    pingMs = 10_000,
    deadAfterMs = 25_000,
    connectTimeoutMs = 20_000, // a link still "connecting" after this is retried
    onStatus = () => {},
    onAuthLost = () => {}, // the server says this session is no longer allowed
    onShopSettings = () => {}, // print settings the server returns with every poll
    now = () => Date.now(),
}) {
    const conns = new Map(); // peerId -> conn
    const known = new Map(); // peerId -> presence info from the server
    const earlyIce = new Map(); // `${peerId}:${sid}` -> candidates that beat their offer
    let pollTimer = null;
    let pingTimer = null;
    let stopped = true;
    let signalingUp = null; // null unknown, true, false, or "denied"
    let lastError = null;
    let httpStatus = null;
    let announceDirty = true;
    let serverIce = [];
    let lastIceSig = "";
    let lastOnlineSig = "";
    let pollFailures = 0;
    const lastFail = new Map(); // peerId -> { reason, at }, kept across retries
    const attempts = new Map(); // peerId -> number of connection attempts
    const webrtcSupported = typeof RTCPeerConnectionImpl === "function";

    const iceConfig = () => [...iceServers, ...serverIce];

    // ----------------------------------------------------------- diagnostics

    const logBuf = [];
    const note = (kind, detail = {}, level = "debug") => {
        const entry = { t: new Date(now()).toISOString().slice(11, 23), kind, ...detail };
        logBuf.push(entry);
        if (logBuf.length > 200) logBuf.shift();
        try {
            console[level]?.("[mesh]", kind, detail);
        } catch {
            /* no console */
        }
    };

    const shortId = (id) => (id ? String(id).slice(0, 8) : "?");

    const status = () => ({
        webrtcUnsupported: !webrtcSupported,
        signaling: signalingUp,
        httpStatus,
        lastError,
        connecting: [...conns.values()].filter((c) => c.state === "connecting").length,
        open: [...conns.values()].filter((c) => c.state === "open").length,
        failed: [...conns.entries()]
            .filter(([, c]) => c.state === "failed")
            .map(([id, c]) => ({ id, reason: c.reason })),
        online: [...known.values()].map((p) => ({
            id: p.device_id,
            name: p.name,
            canPrint: !!p.can_print,
            isKitchen: !!p.is_kitchen,
            isBar: !!p.is_bar,
        })),
        connections: [...conns.entries()].map(([id, c]) => ({
            id,
            name: known.get(id)?.name || bus.peers().find((p) => p.id === id)?.name || null,
            state: c.state,
            reason: c.reason,
            ice: c.ice,
            initiator: c.initiator,
            local: { ...c.cands.local },
            remote: { ...c.cands.remote },
            path: c.path,
            attempts: attempts.get(id) || 0,
            lastFailure: lastFail.get(id) || null,
        })),
        iceServers: iceConfig().map((s) => s.urls),
    });
    const emitStatus = () => onStatus(status());

    // -------------------------------------------------------------- sending

    function makeLink(conn, info) {
        const dc = conn.dc;
        const backlog = [];
        const HIGH = 1024 * 1024;
        dc.bufferedAmountLowThreshold = 256 * 1024;

        const drain = () => {
            while (backlog.length && dc.readyState === "open" && dc.bufferedAmount < HIGH) {
                try {
                    dc.send(backlog.shift());
                } catch {
                    backlog.length = 0; // the channel closed under us; teardown follows
                    return;
                }
            }
        };
        dc.onbufferedamountlow = drain;

        return {
            info,
            send(msg) {
                if (dc.readyState !== "open") return;
                for (const frame of encodeFrames(msg)) backlog.push(frame);
                drain();
            },
            close() {
                teardown(conn.peerId, "closed locally");
            },
        };
    }

    // Raw send on a channel, used before the link is verified.
    function sendRaw(conn, msg) {
        if (conn.dc?.readyState !== "open") return;
        try {
            for (const frame of encodeFrames(msg)) conn.dc.send(frame);
        } catch {
            /* channel closed under us; teardown follows */
        }
    }

    const candidateSummary = (conn) => {
        const f = (c) =>
            `host ${c.host}, srflx ${c.srflx}, relay ${c.relay}${c.mdns ? `, mDNS ${c.mdns}` : ""}`;
        return `this device: ${f(conn.cands.local)}; other device: ${f(conn.cands.remote)}`;
    };

    // ---------------------------------------------------------- connections

    function newConn(peerId, sid, initiator) {
        const pc = new RTCPeerConnectionImpl({ iceServers: iceConfig() });
        attempts.set(peerId, (attempts.get(peerId) || 0) + 1);
        const conn = {
            peerId,
            sid,
            initiator,
            pc,
            dc: null,
            state: "connecting",
            reason: null,
            ice: null,
            path: null,
            cands: { local: emptyCounts(), remote: emptyCounts() },
            remoteSet: false,
            pendingIce: [],
            reassembler: createReassembler(),
            verified: false,
            lastSeen: now(),
            retryAt: 0,
            backoff: 2000,
            startedAt: now(),
        };

        pc.onicecandidate = (e) => {
            if (!e.candidate) {
                note("ice gathering finished", { peer: shortId(peerId) });
                return;
            }
            const raw = typeof e.candidate.toJSON === "function" ? e.candidate.toJSON() : e.candidate;
            count(conn.cands.local, classifyCandidate(raw.candidate));
            signaling
                .send({ to: peerId, type: "ice", sid, payload: JSON.stringify(raw) })
                .catch((err) => note("ice send failed", { peer: shortId(peerId), status: err?.status }, "warn"));
        };

        pc.oniceconnectionstatechange = () => {
            if (conns.get(peerId) !== conn) return;
            conn.ice = pc.iceConnectionState;
            note("ice state", { peer: shortId(peerId), state: conn.ice });
            if (conn.ice === "failed") {
                teardown(peerId, `ICE failed, no network path found (${candidateSummary(conn)})`);
            } else {
                emitStatus();
            }
        };

        pc.onconnectionstatechange = () => {
            if (conns.get(peerId) !== conn) return;
            if (pc.connectionState === "failed" || pc.connectionState === "closed") {
                teardown(peerId, `connection ${pc.connectionState}`);
            }
        };

        return conn;
    }

    function sendHello(conn) {
        const self = getSelfInfo();
        sendRaw(conn, {
            t: "hello",
            deviceId,
            shopId: self.shopId,
            name: self.name,
            canPrint: !!self.canPrint,
            isKitchen: !!self.isKitchen,
            isBar: !!self.isBar,
        });
    }

    function wireChannel(conn, dc) {
        conn.dc = dc;
        dc.onopen = () => {
            note("data channel open", { peer: shortId(conn.peerId) });
            sendHello(conn);
        };
        // A channel handed to us by the other side may already be open by the
        // time we attach handlers, in which case onopen would never fire.
        if (dc.readyState === "open") dc.onopen();
        dc.onclose = () => {
            if (conns.get(conn.peerId) === conn) teardown(conn.peerId, "channel closed");
        };
        dc.onmessage = (e) => {
            const frame = typeof e.data === "string" ? e.data : null;
            const msg = conn.reassembler.push(frame);
            if (!msg) return;
            conn.lastSeen = now();
            handleMessage(conn, msg);
        };
    }

    function handleMessage(conn, msg) {
        if (msg.t === "hello") {
            const self = getSelfInfo();
            // The only thing standing between two shops' data is this check.
            if (msg.shopId !== self.shopId || msg.deviceId !== conn.peerId) {
                note("hello rejected", { peer: shortId(conn.peerId), why: "shop or device mismatch" }, "warn");
                conn.reason = "shop mismatch";
                teardown(conn.peerId, "shop mismatch");
                return;
            }
            if (conn.verified) return;
            conn.verified = true;
            conn.state = "open";
            conn.backoff = 2000;
            const link = makeLink(conn, {
                deviceId: conn.peerId,
                name: msg.name || conn.peerId.slice(0, 6),
                canPrint: !!msg.canPrint,
                isKitchen: !!msg.isKitchen,
                isBar: !!msg.isBar,
            });
            conn.link = link;
            bus.attach(conn.peerId, link);
            note("link up", { peer: shortId(conn.peerId), name: msg.name }, "info");
            describePath(conn.pc).then((path) => {
                if (path && conns.get(conn.peerId) === conn) {
                    conn.path = path;
                    note("path", { peer: shortId(conn.peerId), path }, "info");
                    emitStatus();
                }
            });
            emitStatus();
            return;
        }
        if (!conn.verified) return; // ignore anything before the handshake
        if (msg.t === "ping") return sendRaw(conn, { t: "pong" });
        if (msg.t === "pong") return;
        if (msg.t === "info") {
            bus.updateInfo(conn.peerId, {
                name: msg.name,
                canPrint: !!msg.canPrint,
                isKitchen: !!msg.isKitchen,
                isBar: !!msg.isBar,
            });
            return;
        }
        bus.receive(conn.peerId, msg);
    }

    function teardown(peerId, reason) {
        const conn = conns.get(peerId);
        if (!conn || conn.state === "failed") return;
        const wasOpen = conn.verified;
        conn.state = "failed";
        conn.reason = reason;
        conn.retryAt = now() + conn.backoff;
        conn.backoff = Math.min(conn.backoff * 2, 30_000);
        note("link down", { peer: shortId(peerId), reason, wasOpen }, wasOpen ? "info" : "warn");
        if (reason !== "stopped" && reason !== "replaced by new offer") {
            lastFail.set(peerId, { reason, at: new Date(now()).toISOString() });
        }
        try {
            conn.dc && (conn.dc.onclose = null);
            conn.dc?.close();
        } catch {
            /* ignore */
        }
        try {
            conn.pc.close();
        } catch {
            /* ignore */
        }
        if (wasOpen) bus.detach(peerId);
        emitStatus();
    }

    // ------------------------------------------------------------ signaling

    const sendSignal = (peerId, type, sid, payload) =>
        signaling.send({ to: peerId, type, sid, payload: JSON.stringify(payload) });

    async function initiate(peerId) {
        const sid = randomId();
        let conn;
        try {
            conn = newConn(peerId, sid, true);
        } catch (err) {
            note("could not create a connection", { message: err?.message }, "warn");
            return;
        }
        conns.set(peerId, conn);
        note("making offer", { peer: shortId(peerId) });
        emitStatus();
        try {
            wireChannel(conn, conn.pc.createDataChannel("mesh", { ordered: true }));
            const offer = await conn.pc.createOffer();
            await conn.pc.setLocalDescription(offer);
            const d = conn.pc.localDescription;
            await sendSignal(peerId, "offer", sid, { type: d.type, sdp: d.sdp });
            note("offer sent", { peer: shortId(peerId) });
        } catch (err) {
            teardown(peerId, `offer failed: ${err.message}`);
        }
    }

    async function flushIce(conn) {
        const queued = [...conn.pendingIce.splice(0), ...(earlyIce.get(`${conn.peerId}:${conn.sid}`) || [])];
        earlyIce.delete(`${conn.peerId}:${conn.sid}`);
        for (const c of queued) {
            try {
                await conn.pc.addIceCandidate(c);
            } catch {
                /* stale candidate */
            }
        }
    }

    async function handleSignal(msg) {
        const { from, type, sid } = msg;
        const payload = parsePayload(msg.payload);
        if (!from || from === deviceId) return;
        if (!payload) {
            note("bad signal payload", { peer: shortId(from), type }, "warn");
            return;
        }

        if (type === "offer") {
            if (!webrtcSupported) return;
            note("offer received", { peer: shortId(from) });
            // A fresh offer always replaces whatever we had with that peer.
            const old = conns.get(from);
            if (old && old.sid !== sid) teardown(from, "replaced by new offer");

            const conn = newConn(from, sid, false);
            conns.set(from, conn);
            conn.pc.ondatachannel = (e) => wireChannel(conn, e.channel);
            emitStatus();
            try {
                await conn.pc.setRemoteDescription(payload);
                conn.remoteSet = true;
                await flushIce(conn);
                const answer = await conn.pc.createAnswer();
                await conn.pc.setLocalDescription(answer);
                const d = conn.pc.localDescription;
                await sendSignal(from, "answer", sid, { type: d.type, sdp: d.sdp });
                note("answer sent", { peer: shortId(from) });
            } catch (err) {
                teardown(from, `answer failed: ${err.message}`);
            }
            return;
        }

        const conn = conns.get(from);

        if (type === "answer") {
            note("answer received", { peer: shortId(from) });
            if (!conn || conn.sid !== sid || !conn.initiator || conn.remoteSet) return;
            try {
                await conn.pc.setRemoteDescription(payload);
                conn.remoteSet = true;
                await flushIce(conn);
            } catch (err) {
                teardown(from, `answer rejected: ${err.message}`);
            }
            return;
        }

        if (type === "ice") {
            const cls = classifyCandidate(payload.candidate);
            if (!conn || conn.sid !== sid) {
                const key = `${from}:${sid}`;
                if (!earlyIce.has(key)) earlyIce.set(key, []);
                earlyIce.get(key).push(payload);
                return;
            }
            count(conn.cands.remote, cls);
            if (!conn.remoteSet) conn.pendingIce.push(payload);
            else {
                try {
                    await conn.pc.addIceCandidate(payload);
                } catch {
                    /* stale candidate */
                }
            }
        }
    }

    function maybeConnect(peerId) {
        if (peerId === deviceId) return;
        if (!webrtcSupported) return; // reported through status().webrtcUnsupported
        const conn = conns.get(peerId);
        const needs = !conn || (conn.state === "failed" && now() >= conn.retryAt);
        // A connection stuck in "connecting" for too long is retried too.
        const stuck = conn && conn.state === "connecting" && now() - conn.startedAt > connectTimeoutMs;
        if (stuck) {
            // Mark it failed and let the normal backoff decide when to retry,
            // so the reason stays visible instead of flashing past.
            teardown(peerId, `timed out waiting for the other device (${candidateSummary(conn)})`);
            return;
        }
        if (!needs) return;
        // Only the smaller id makes the offer. The other side just waits.
        if (deviceId < peerId) initiate(peerId);
    }

    // ----------------------------------------------------------------- loop

    async function poll() {
        if (stopped) return;
        try {
            const self = getSelfInfo();
            const res = await signaling.poll({
                device_id: deviceId,
                name: self.name,
                can_print: !!self.canPrint,
                is_kitchen: !!self.isKitchen,
                is_bar: !!self.isBar,
            });
            if (signalingUp !== true) {
                note("server reachable", {}, "info");
                signalingUp = true;
                lastError = null;
                httpStatus = null;
                emitStatus();
            }
            pollFailures = 0;
            announceDirty = false;

            if (Array.isArray(res.ice_servers)) {
                const sig = JSON.stringify(res.ice_servers.map((s) => s.urls));
                if (sig !== lastIceSig) {
                    lastIceSig = sig;
                    serverIce = res.ice_servers;
                    note("ice servers", { urls: res.ice_servers.map((s) => s.urls) }, "info");
                    emitStatus();
                }
            }

            if (res.shop_settings && typeof res.shop_settings === "object") {
                try {
                    onShopSettings(res.shop_settings);
                } catch (e) {
                    note("settings handler failed", { message: e?.message }, "warn");
                }
            }

            known.clear();
            for (const p of res.peers || []) known.set(p.device_id, p);
            const onlineSig = [...known.keys()].sort().join(",");
            if (onlineSig !== lastOnlineSig) {
                lastOnlineSig = onlineSig;
                note("devices online", { count: known.size, names: [...known.values()].map((p) => p.name) }, "info");
                emitStatus();
            }
            for (const id of known.keys()) maybeConnect(id);
            for (const m of res.messages || []) await handleSignal(m);
        } catch (err) {
            if ([401, 403, 419].includes(err?.status)) {
                // Logged out or not allowed any more. Stop quietly instead of
                // hammering the server every two seconds, but say why.
                note("server refused this device", { status: err.status }, "warn");
                signalingUp = "denied";
                httpStatus = err.status;
                lastError = `The server refused this device (HTTP ${err.status})`;
                emitStatus();
                onAuthLost(err);
                return;
            }
            // Offline or server down. Existing links are untouched.
            pollFailures += 1;
            lastError = err?.message || "request failed";
            httpStatus = err?.status ?? null;
            if (pollFailures === 1 || pollFailures % 15 === 0) {
                note("cannot reach server", { status: err?.status, message: err?.message }, "warn");
            }
            if (signalingUp !== false) {
                signalingUp = false;
                emitStatus();
            }
        }
        if (stopped) return;
        const busy = [...conns.values()].some((c) => c.state === "connecting");
        const missing = [...known.keys()].some((id) => !conns.get(id) || conns.get(id).state !== "open");
        pollTimer = setTimeout(poll, busy || missing || announceDirty ? pollMs : idlePollMs);
    }

    function heartbeat() {
        for (const conn of conns.values()) {
            if (conn.state !== "open") continue;
            if (now() - conn.lastSeen > deadAfterMs) {
                teardown(conn.peerId, "no response");
                continue;
            }
            sendRaw(conn, { t: "ping" });
        }
    }

    return {
        start() {
            if (!stopped) return;
            stopped = false;
            note("mesh started", { device: shortId(deviceId), webrtc: webrtcSupported }, webrtcSupported ? "debug" : "warn");
            poll();
            pingTimer = setInterval(heartbeat, pingMs);
        },

        stop() {
            stopped = true;
            clearTimeout(pollTimer);
            clearInterval(pingTimer);
            for (const id of [...conns.keys()]) teardown(id, "stopped");
            conns.clear();
            signaling.leave?.();
        },

        /** Tell everyone this device was renamed or became a print station. */
        announce() {
            const self = getSelfInfo();
            for (const conn of conns.values()) {
                if (conn.verified && conn.state === "open") {
                    sendRaw(conn, {
                        t: "info",
                        name: self.name,
                        canPrint: !!self.canPrint,
                        isKitchen: !!self.isKitchen,
                        isBar: !!self.isBar,
                    });
                }
            }
            announceDirty = true;
            clearTimeout(pollTimer);
            if (!stopped) pollTimer = setTimeout(poll, 50);
        },

        /** Devices the server says are online, connected or not. */
        online: () => [...known.values()],
        status,
        getDiagnostics: () => ({ log: logBuf.slice(), status: status() }),
    };
}

// ----------------------------------------------------------------------
// HTTP signaling client for the Laravel endpoints in routes/devices.php
// ----------------------------------------------------------------------

// Laravel accepts the token from either the X-CSRF-TOKEN header (page meta tag)
// or X-XSRF-TOKEN (cookie). The cookie is refreshed whenever the session is
// regenerated, so prefer it and fall back to the meta tag.
export function readCsrfHeaders(doc = globalThis.document) {
    if (!doc) return {};
    const cookie = doc.cookie?.split("; ").find((c) => c.startsWith("XSRF-TOKEN="));
    if (cookie) return { "X-XSRF-TOKEN": decodeURIComponent(cookie.split("=")[1]) };
    const meta = doc.querySelector?.('meta[name="csrf-token"]')?.content;
    return meta ? { "X-CSRF-TOKEN": meta } : {};
}

export function createHttpSignaling({
    deviceId,
    fetchImpl = (...a) => globalThis.fetch(...a),
    csrfHeaders = () => readCsrfHeaders(),
} = {}) {
    const call = async (url, body, extra = {}) => {
        const res = await fetchImpl(url, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
                ...csrfHeaders(),
            },
            body: JSON.stringify(body),
            ...extra,
        });
        if (!res.ok) {
            const err = new Error(`signaling ${res.status}`);
            err.status = res.status;
            throw err;
        }
        return res.json().catch(() => ({}));
    };

    return {
        poll: (self) => call("/devices/poll", self),
        send: (msg) => call("/devices/signal", { ...msg, device_id: deviceId }),
        leave: () => {
            // keepalive lets the request outlive a closing page
            call("/devices/leave", { device_id: deviceId }, { keepalive: true }).catch(() => {});
        },
    };
}
