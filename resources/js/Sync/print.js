// Sync/print.js
//
// Sends a print job to another device in the shop. Browsers cannot see or
// drive other machines' printers, so the job (plain data, not HTML) travels
// over the mesh to a device that has been marked as a print station, and that
// device renders it and prints through its own browser.

const DEFAULT_TIMEOUT = 20_000;
const SEEN_LIMIT = 200;

const randomId = () =>
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);

export function createPrintService({
    bus,
    deviceId,
    getSelf, // () => ({ canPrint })
    onJob, // async (job) => void, renders and prints on THIS device
    timeoutMs = DEFAULT_TIMEOUT,
    makeId = randomId,
}) {
    const pending = new Map(); // jobId -> { resolve, reject, timer, target }
    const seen = new Set(); // jobIds already handled (a retransmit must not print twice)
    const unsubs = [];

    const remember = (id) => {
        seen.add(id);
        if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value);
    };

    unsubs.push(
        bus.on("print", async (msg, from) => {
            const { jobId, job } = msg;
            if (!jobId || !job) return;
            if (seen.has(jobId)) {
                bus.send(from, { t: "print_ack", jobId, ok: true, duplicate: true });
                return;
            }
            remember(jobId);

            if (!getSelf().canPrint) {
                bus.send(from, {
                    t: "print_ack",
                    jobId,
                    ok: false,
                    error: "This device is not set up as a printer",
                });
                return;
            }
            try {
                await onJob(job);
                bus.send(from, { t: "print_ack", jobId, ok: true });
            } catch (err) {
                bus.send(from, { t: "print_ack", jobId, ok: false, error: err?.message || "Print failed" });
            }
        }),

        bus.on("print_ack", (msg) => {
            const p = pending.get(msg.jobId);
            if (!p) return;
            clearTimeout(p.timer);
            pending.delete(msg.jobId);
            if (msg.ok) p.resolve({ ok: true });
            else p.reject(new Error(msg.error || "Print failed"));
        }),

        // The printer went offline while we were waiting on it.
        bus.onPeerDown((peerId) => {
            for (const [id, p] of pending) {
                if (p.target === peerId) {
                    clearTimeout(p.timer);
                    pending.delete(id);
                    p.reject(new Error("The printer disconnected"));
                }
            }
        }),
    );

    return {
        /**
         * Print a job on `targetId` (use this device's id to print locally).
         * Resolves when that device has handled it, rejects with a readable
         * message when it cannot.
         */
        sendPrint(targetId, job) {
            if (!targetId || targetId === deviceId) return onJob(job).then(() => ({ ok: true }));
            if (!bus.has(targetId)) {
                return Promise.reject(new Error("That printer is not connected right now"));
            }
            const jobId = makeId();
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    pending.delete(jobId);
                    reject(new Error("The printer did not respond"));
                }, timeoutMs);
                pending.set(jobId, { resolve, reject, timer, target: targetId });
                bus.send(targetId, { t: "print", jobId, job });
            });
        },

        stop() {
            unsubs.splice(0).forEach((u) => u());
            for (const p of pending.values()) clearTimeout(p.timer);
            pending.clear();
        },
    };
}
