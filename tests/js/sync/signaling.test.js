import { createHttpSignaling, readCsrfHeaders } from "../../../resources/js/Sync/rtc";

const okJson = (body = {}) => ({ ok: true, status: 200, json: async () => body });

describe("http signaling client", () => {
    it("posts presence and setup messages to the Laravel endpoints with CSRF and the sender id", async () => {
        const calls = [];
        const sig = createHttpSignaling({
            deviceId: "dev-1",
            fetchImpl: async (url, init) => (calls.push({ url, init }), okJson({ peers: [], messages: [] })),
            csrfHeaders: () => ({ "X-XSRF-TOKEN": "tok" }),
        });
        await sig.poll({ device_id: "dev-1", name: "Bar", can_print: false });
        await sig.send({ to: "dev-2", type: "offer", sid: "s", payload: { sdp: "x" } });

        expect(calls[0].url).toBe("/devices/poll");
        expect(calls[0].init.headers["X-XSRF-TOKEN"]).toBe("tok");
        expect(calls[0].init.credentials).toBe("same-origin");
        expect(calls[1].url).toBe("/devices/signal");
        expect(JSON.parse(calls[1].init.body)).toMatchObject({ device_id: "dev-1", to: "dev-2", type: "offer" });
    });

    it("exposes the HTTP status so the mesh can tell 'logged out' from 'offline'", async () => {
        const sig = createHttpSignaling({
            deviceId: "d",
            fetchImpl: async () => ({ ok: false, status: 419, json: async () => ({}) }),
        });
        await expect(sig.poll({})).rejects.toMatchObject({ status: 419 });
    });

    it("prefers the refreshed XSRF cookie over the page meta tag", () => {
        const doc = {
            cookie: "a=1; XSRF-TOKEN=abc%3D%3D; b=2",
            querySelector: () => ({ content: "meta-token" }),
        };
        expect(readCsrfHeaders(doc)).toEqual({ "X-XSRF-TOKEN": "abc==" });
        expect(readCsrfHeaders({ cookie: "", querySelector: () => ({ content: "meta-token" }) })).toEqual({
            "X-CSRF-TOKEN": "meta-token",
        });
        expect(readCsrfHeaders(null)).toEqual({});
    });
});
