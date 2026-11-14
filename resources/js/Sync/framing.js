// Sync/framing.js
//
// WebRTC data channels only guarantee small messages cross browsers (16 KB is
// the safe ceiling). Our digests and record batches can be bigger, so every
// message is split into frames and reassembled on the other side.
//
// Frame: "<msgId>|<index>|<count>|<chunk>"
// 5000 chars is at most ~15 KB even if every char takes 3 bytes in UTF-8.

const CHUNK_CHARS = 5000;

export function encodeFrames(obj, makeId = () => Math.random().toString(36).slice(2, 10)) {
    const json = JSON.stringify(obj);
    const id = makeId();
    const count = Math.max(1, Math.ceil(json.length / CHUNK_CHARS));
    const frames = [];
    for (let i = 0; i < count; i++) {
        frames.push(`${id}|${i}|${count}|${json.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS)}`);
    }
    return frames;
}

export function createReassembler({ maxPending = 50 } = {}) {
    const pending = new Map(); // msgId -> { parts: [], got: n }

    return {
        /** Feed one frame. Returns the full message when complete, else null. */
        push(frame) {
            if (typeof frame !== "string") return null;
            const a = frame.indexOf("|");
            const b = frame.indexOf("|", a + 1);
            const c = frame.indexOf("|", b + 1);
            if (a < 0 || b < 0 || c < 0) return null;

            const id = frame.slice(0, a);
            const index = Number(frame.slice(a + 1, b));
            const count = Number(frame.slice(b + 1, c));
            const chunk = frame.slice(c + 1);
            if (!Number.isInteger(index) || !Number.isInteger(count) || count < 1 || index >= count) {
                return null;
            }

            let entry = pending.get(id);
            if (!entry) {
                // Drop the oldest half-finished message rather than grow forever.
                if (pending.size >= maxPending) pending.delete(pending.keys().next().value);
                entry = { parts: new Array(count), got: 0 };
                pending.set(id, entry);
            }
            if (entry.parts[index] === undefined) {
                entry.parts[index] = chunk;
                entry.got += 1;
            }
            if (entry.got < count) return null;

            pending.delete(id);
            try {
                return JSON.parse(entry.parts.join(""));
            } catch {
                return null;
            }
        },
    };
}
