import { createBus } from "../../../resources/js/Sync/bus";
import { createPrintService } from "../../../resources/js/Sync/print";

const sleep = (ms = 20) => new Promise((r) => setTimeout(r, ms));

function pair() {
    const a = createBus("A");
    const b = createBus("B");
    const link = (from, to) => ({
        info: {},
        send: (msg) => setTimeout(() => to.receive(from.selfId, JSON.parse(JSON.stringify(msg))), 0),
        close() {},
    });
    a.attach("B", link(a, b));
    b.attach("A", link(b, a));
    return { a, b };
}

describe("remote printing", () => {
    it("prints on the target device and confirms back", async () => {
        const { a, b } = pair();
        const printed = [];
        const svcA = createPrintService({ bus: a, deviceId: "A", getSelf: () => ({ canPrint: false }), onJob: async () => {} });
        createPrintService({
            bus: b, deviceId: "B", getSelf: () => ({ canPrint: true }),
            onJob: async (job) => printed.push(job),
        });
        const res = await svcA.sendPrint("B", { template: "kitchen", props: { tableName: "T4" } });
        expect(res.ok).toBe(true);
        expect(printed).toEqual([{ template: "kitchen", props: { tableName: "T4" } }]);
    });

    it("a device that is not a print station says so", async () => {
        const { a, b } = pair();
        const svcA = createPrintService({ bus: a, deviceId: "A", getSelf: () => ({}), onJob: async () => {} });
        createPrintService({ bus: b, deviceId: "B", getSelf: () => ({ canPrint: false }), onJob: async () => {} });
        await expect(svcA.sendPrint("B", { template: "bill", props: {} })).rejects.toThrow(/not set up as a printer/);
    });

    it("never prints the same job twice if it is delivered twice", async () => {
        const { a, b } = pair();
        const printed = [];
        createPrintService({ bus: b, deviceId: "B", getSelf: () => ({ canPrint: true }), onJob: async (j) => printed.push(j) });
        const msg = { t: "print", jobId: "job-1", job: { template: "bill", props: {} } };
        a.send("B", msg);
        a.send("B", msg);
        await sleep(60);
        expect(printed.length).toBe(1);
    });

    it("surfaces a failed print and a vanished printer", async () => {
        const { a, b } = pair();
        const svcA = createPrintService({ bus: a, deviceId: "A", getSelf: () => ({}), onJob: async () => {}, timeoutMs: 200 });
        createPrintService({
            bus: b, deviceId: "B", getSelf: () => ({ canPrint: true }),
            onJob: async () => { throw new Error("Out of paper"); },
        });
        await expect(svcA.sendPrint("B", { template: "bill", props: {} })).rejects.toThrow("Out of paper");

        await expect(svcA.sendPrint("nobody", { template: "bill", props: {} })).rejects.toThrow(/not connected/);

        // peer drops while we are waiting
        const { a: a2, b: b2 } = pair();
        const svc2 = createPrintService({ bus: a2, deviceId: "A", getSelf: () => ({}), onJob: async () => {} });
        createPrintService({ bus: b2, deviceId: "B", getSelf: () => ({ canPrint: true }), onJob: () => new Promise(() => {}) });
        const p = svc2.sendPrint("B", { template: "bill", props: {} });
        await sleep(20);
        a2.detach("B");
        await expect(p).rejects.toThrow(/disconnected/);
    });

    it("printing on this device skips the network", async () => {
        const { a } = pair();
        const printed = [];
        const svc = createPrintService({ bus: a, deviceId: "A", getSelf: () => ({ canPrint: true }), onJob: async (j) => printed.push(j) });
        await svc.sendPrint("A", { template: "bill", props: { x: 1 } });
        expect(printed.length).toBe(1);
    });
});
