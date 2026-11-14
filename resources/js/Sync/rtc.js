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

import { encodeFrames, createReassembler } from "./framing";

const randomId = () =>
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);

export function createRTCMesh({
    bus,
    deviceId,
    getSelfInfo, // () => ({ name, canPrint, shopId })
    signaling, // { poll(self) -> { peers, messages }, send(msg), leave?() }
    RTCPeerConnectionImpl = globalThis.RTCPeerConnection,
    iceServers = [], // empty = LAN only (no internet needed to connect)
    pollMs = 2000,
    idlePollMs = 6000,
    pingMs = 10_000,
    deadAfterMs = 25_000,
    onStatus = () => {},
    onAuthLost = () => {}, // the server says this session is no longer allowed
    now = () => Date.now(),
}) {
    const conns = new Map(); // peerId -> conn
    const known = new Map(); // peerId -> presence info from the server
    const earlyIce = new Map(); // `${peerId}:${sid}` -> candidates that beat their offer
    let pollTimer = null;
    let pingTimer = null;
    let stopped = true;
    let signalingUp = null; // null unknown, true, false
    let announceDirty = true;

    const status = () => ({
        signaling: signalingUp,
        connecting: [...conns.values()].filter((c) => c.state === "connecting").length,
        open: [...conns.values()].filter((c) => c.state === "open").length,
        failed: [...conns.entries()]
            .filter(([, c]) => c.state === "failed")
            .map(([id, c]) => ({ id, reason: c.reason })),
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
                dc.send(backlog.shift());
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
        for (const frame of encodeFrames(msg)) conn.dc.send(frame);
    }

    // ---------------------------------------------------------- connections

    function newConn(peerId, sid, initiator) {
        const pc = new RTCPeerConnectionImpl({ iceServers });
        const conn = {
            peerId,
            sid,
            initiator,
            pc,
            dc: null,
            state: "connecting",
            reason: null,
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
            if (e.candidate) {
                signaling
                    .send({
                        to: peerId,
                        type: "ice",
                        sid,
                        payload: typeof e.candidate.toJSON === "function" ? e.candidate.toJSON() : e.candidate,
                    })
                    .catch(() => {});
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

    function wireChannel(conn, dc) {
        conn.dc = dc;
        dc.onopen = () => {
            const self = getSelfInfo();
            sendRaw(conn, {
                t: "hello",
                deviceId,
                shopId: self.shopId,
                name: self.name,
                canPrint: !!self.canPrint,
            });
        };
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
            });
            conn.link = link;
            bus.attach(conn.peerId, link);
            emitStatus();
            return;
        }
        if (!conn.verified) return; // ignore anything before the handshake
        if (msg.t === "ping") return sendRaw(conn, { t: "pong" });
        if (msg.t === "pong") return;
        if (msg.t === "info") {
            bus.updateInfo(conn.peerId, { name: msg.name, canPrint: !!msg.canPrint });
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

    async function initiate(peerId) {
        const sid = randomId();
        const conn = newConn(peerId, sid, true);
        conns.set(peerId, conn);
        emitStatus();
        try {
            wireChannel(conn, conn.pc.createDataChannel("mesh", { ordered: true }));
            const offer = await conn.pc.createOffer();
            await conn.pc.setLocalDescription(offer);
            const d = conn.pc.localDescription;
            await signaling.send({
                to: peerId,
                type: "offer",
                sid,
                payload: { type: d.type, sdp: d.sdp },
            });
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
        const { from, type, sid, payload } = msg;
        if (!from || from === deviceId) return;

        if (type === "offer") {
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
                await signaling.send({ to: from, type: "answer", sid, payload: { type: d.type, sdp: d.sdp } });
            } catch (err) {
                teardown(from, `answer failed: ${err.message}`);
            }
            return;
        }

        const conn = conns.get(from);

        if (type === "answer") {
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
            if (!conn || conn.sid !== sid) {
                const key = `${from}:${sid}`;
                if (!earlyIce.has(key)) earlyIce.set(key, []);
                earlyIce.get(key).push(payload);
                return;
            }
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
        const conn = conns.get(peerId);
        const needs = !conn || (conn.state === "failed" && now() >= conn.retryAt);
        // A connection stuck in "connecting" for too long is retried too.
        const stuck = conn && conn.state === "connecting" && now() - conn.startedAt > 20_000;
        if (stuck) teardown(peerId, "timed out");
        if (!needs && !stuck) return;
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
            });
            if (signalingUp !== true) {
                signalingUp = true;
                emitStatus();
            }
            announceDirty = false;

            known.clear();
            for (const p of res.peers || []) {
                known.set(p.device_id, p);
                maybeConnect(p.device_id);
            }
            for (const m of res.messages || []) await handleSignal(m);
        } catch (err) {
            if ([401, 403, 419].includes(err?.status)) {
                // Logged out or not allowed any more. Stop quietly instead of
                // hammering the server every two seconds.
                onAuthLost(err);
                return;
            }
            // Offline or server down. Existing links are untouched.
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
                    sendRaw(conn, { t: "info", name: self.name, canPrint: !!self.canPrint });
                }
            }
            announceDirty = true;
            clearTimeout(pollTimer);
            if (!stopped) pollTimer = setTimeout(poll, 50);
        },

        /** Devices the server says are online, connected or not. */
        online: () => [...known.values()],
        status,
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
