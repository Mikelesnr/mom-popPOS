// Sync/hlc.js
//
// Hybrid logical clock. Every replicated record is stamped with one of these,
// so two devices can agree on "which edit is newer" without trusting that
// their wall clocks match (cheap phones in the field often drift).
//
// Stamps are fixed width strings, so plain string comparison (<, >) orders
// them correctly. Format: <ms:15>.<counter:5>.<device tag:8>

const PAD_MS = 15;
const PAD_C = 5;

export function parseHLC(str) {
    if (typeof str !== "string") return null;
    const m = /^(\d{15})\.(\d{5})\.([0-9a-f]{1,8})$/.exec(str);
    if (!m) return null;
    return { ms: Number(m[1]), c: Number(m[2]), tag: m[3] };
}

export function compareHLC(a, b) {
    const x = a || "";
    const y = b || "";
    if (x === y) return 0;
    return x > y ? 1 : -1;
}

/**
 * @param {object}   opts
 * @param {string}   opts.deviceId     stable id of this device
 * @param {Function} [opts.now]        injectable clock (tests)
 * @param {number}   [opts.maxDriftMs] remote clocks further ahead than this
 *                                     are clamped, so one phone with a wrong
 *                                     date cannot drag every device into 2031
 * @param {Function} [opts.load]       () => last persisted stamp | null
 * @param {Function} [opts.save]       (stamp) => void
 */
export function createHLC({
    deviceId,
    now = () => Date.now(),
    maxDriftMs = 60 * 60 * 1000,
    load,
    save,
}) {
    const tag = String(deviceId).replace(/-/g, "").slice(0, 8).toLowerCase();
    let ms = 0;
    let c = 0;

    const saved = parseHLC(load?.());
    if (saved) {
        ms = saved.ms;
        c = saved.c;
    }

    const format = () =>
        `${String(ms).padStart(PAD_MS, "0")}.${String(c).padStart(PAD_C, "0")}.${tag}`;

    return {
        /** Stamp for a local write. */
        tick() {
            const wall = now();
            if (wall > ms) {
                ms = wall;
                c = 0;
            } else {
                c += 1;
            }
            const stamp = format();
            save?.(stamp);
            return stamp;
        },

        /** Fold a stamp seen on a remote record into our clock. */
        receive(remote) {
            const p = parseHLC(remote);
            if (!p) return;

            const wall = now();
            const clamped = p.ms > wall + maxDriftMs;
            const rms = clamped ? wall + maxDriftMs : p.ms;
            const rc = clamped ? 0 : p.c;

            const next = Math.max(ms, rms, wall);
            if (next === ms && next === rms) c = Math.max(c, rc) + 1;
            else if (next === ms) c += 1;
            else if (next === rms) c = rc + 1;
            else c = 0;
            ms = next;
            save?.(format());
        },

        current: format,
    };
}
