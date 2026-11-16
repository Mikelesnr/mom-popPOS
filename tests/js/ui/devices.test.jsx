// Smoke tests for the React side: provider, device panel, remote print host.
// The Inertia/toast/react-to-print imports are stubbed (see tests/js/README.md).

import "fake-indexeddb/auto";
import React from "react";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { __state } from "@inertiajs/react";
import toast, { calls as toastCalls } from "react-hot-toast";
import { printed } from "react-to-print";
import DeviceSyncProvider, { useDeviceSync } from "@/Components/Devices/DeviceSyncProvider";
import { stopEngine } from "@/Sync/engine";

let ctx = null;
const Probe = () => {
    ctx = useDeviceSync();
    return <div data-testid="probe">{ctx.enabled ? "on" : "off"}</div>;
};

beforeEach(() => {
    localStorage.clear();
    toastCalls.length = 0;
    printed.length = 0;
    ctx = null;
    __state.props = { auth: { user: { id: "u1", name: "Tendai", shop_id: "shop-1", role: "cashier" } } };
    // signaling endpoint: nobody else online
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ peers: [], messages: [] }) }));
});
afterEach(() => {
    cleanup();
    stopEngine();
});

describe("DeviceSyncProvider", () => {
    it("is inert for accounts without a shop (owners, admins)", () => {
        __state.props = { auth: { user: { id: "o1", name: "Owner", shop_id: null, role: "owner" } } };
        render(<DeviceSyncProvider><Probe /></DeviceSyncProvider>);
        expect(screen.getByTestId("probe").textContent).toBe("off");
        expect(ctx.printBill({})).toBe(false);
        expect(screen.queryByLabelText("Devices in this shop")).toBeNull();
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("starts for shop staff, polls the signaling endpoint and shows the pill", async () => {
        render(<DeviceSyncProvider><Probe /></DeviceSyncProvider>);
        expect(screen.getByTestId("probe").textContent).toBe("on");
        expect(screen.getByLabelText("Devices in this shop")).toBeTruthy();
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
        expect(globalThis.fetch.mock.calls[0][0]).toBe("/devices/poll");
        expect(ctx.deviceName).toMatch(/^Device [0-9A-F]{4}$/);
        expect(localStorage.getItem("terminal_device_id")).toMatch(/^[0-9a-f-]{36}$/);
    });

    it("naming the device and marking it as a printer persists and updates the context", async () => {
        render(<DeviceSyncProvider><Probe /></DeviceSyncProvider>);
        fireEvent.click(screen.getByLabelText("Devices in this shop"));

        const name = screen.getByPlaceholderText(/Kitchen, Bar/);
        fireEvent.change(name, { target: { value: "Kitchen" } });
        fireEvent.blur(name);
        await waitFor(() => expect(ctx.deviceName).toBe("Kitchen"));
        expect(localStorage.getItem("terminal_device_name")).toBe("Kitchen");

        fireEvent.click(screen.getByRole("checkbox"));
        await waitFor(() => expect(ctx.canPrint).toBe(true));
        expect(localStorage.getItem("terminal_can_print")).toBe("1");
        expect(ctx.printers.map((p) => p.name)).toEqual(["Kitchen (this device)"]);
    });

    it("printBill prints locally by default and when the chosen printer is offline", async () => {
        render(<DeviceSyncProvider><Probe /></DeviceSyncProvider>);
        expect(ctx.printBill({ title: "Receipt", items: [], totals: {} })).toBe(false);
        expect(toastCalls.length).toBe(0);

        act(() => ctx.setRoute("bill", "11111111-1111-4111-8111-111111111111"));
        await waitFor(() => expect(ctx.routes.bill).toBeTruthy());
        expect(ctx.printBill({ title: "Receipt", items: [], totals: {} })).toBe(false);
        expect(toastCalls.some((c) => c.kind === "error" && /offline/.test(c.msg))).toBe(true);
    });

    it("kitchen tickets are off by default and loud when the kitchen printer is offline", async () => {
        render(<DeviceSyncProvider><Probe /></DeviceSyncProvider>);
        ctx.printKitchenTicket({ tableName: "T4", items: [{ quantity: 1, name: "Chips" }] });
        expect(toastCalls.length).toBe(0);

        act(() => ctx.setRoute("kitchen", "22222222-2222-4222-8222-222222222222"));
        await waitFor(() => expect(ctx.routes.kitchen).toBeTruthy());
        ctx.printKitchenTicket({ tableName: "T4", items: [{ quantity: 1, name: "Chips" }] });
        expect(toastCalls.some((c) => c.kind === "error" && /NOT printed/.test(c.msg))).toBe(true);
    });

    it("this device can be its own kitchen printer: renders the ticket and prints it", async () => {
        render(<DeviceSyncProvider><Probe /></DeviceSyncProvider>);
        act(() => {
            ctx.setCanPrint(true);
        });
        await waitFor(() => expect(ctx.canPrint).toBe(true));
        act(() => ctx.setRoute("kitchen", ctx.deviceId));
        await waitFor(() => expect(ctx.routes.kitchen).toBe(ctx.deviceId));

        ctx.printKitchenTicket({
            tableName: "Window seat",
            items: [{ quantity: 2, name: "Castle", metadata: { type: "unit" } }, { quantity: 1, name: "Gin", metadata: { type: "double" } }],
            isUpdate: true,
        });

        await waitFor(() => expect(printed.length).toBe(1), { timeout: 3000 });
        expect(printed[0].title).toBe("Kitchen Window seat");
        expect(printed[0].html).toContain("Window seat");
        expect(printed[0].html).toContain("ADD TO TABLE");
        expect(printed[0].html).toContain("2x");
        expect(printed[0].html).toContain("Gin (double)");
        expect(printed[0].html).not.toMatch(/\$\d/); // no prices on a kitchen ticket
    });

    it("jobs from other devices print through the same host, one at a time", async () => {
        render(<DeviceSyncProvider><Probe /></DeviceSyncProvider>);
        act(() => ctx.setCanPrint(true));
        await waitFor(() => expect(ctx.canPrint).toBe(true));

        const job = (n) => ({ template: "kitchen", title: `Job ${n}`, props: { shopName: "S", tableName: `T${n}`, items: [], time: "10:00" } });
        const results = await Promise.all([ctx.sendPrint(ctx.deviceId, job(1)), ctx.sendPrint(ctx.deviceId, job(2))]);
        expect(results).toEqual([true, true]);
        expect(printed.map((p) => p.title)).toEqual(["Job 1", "Job 2"]);
    });

    it("rejects templates it does not know about", async () => {
        render(<DeviceSyncProvider><Probe /></DeviceSyncProvider>);
        act(() => ctx.setCanPrint(true));
        await waitFor(() => expect(ctx.canPrint).toBe(true));
        const ok = await ctx.sendPrint(ctx.deviceId, { template: "rm-rf", props: {} });
        expect(ok).toBe(false);
        expect(toastCalls.some((c) => c.kind === "error" && /Unknown print template/.test(c.msg))).toBe(true);
        expect(printed.length).toBe(0);
    });

describe("device panel explains what is going wrong", () => {
    const PEER = "00000000-0000-4000-8000-000000000001";
    const BIG_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff"; // larger id: waits for the other side's offer

    const pollReturns = (body, ok = true, status = 200) => {
        globalThis.fetch = vi.fn(async () => ({ ok, status, json: async () => body }));
    };
    const open = () => fireEvent.click(screen.getByLabelText("Devices in this shop"));
    afterEach(() => {
        delete globalThis.RTCPeerConnection;
    });

    it("says nobody else is online when the server lists no other device", async () => {
        globalThis.RTCPeerConnection = class {};
        pollReturns({ peers: [], messages: [] });
        render(<DeviceSyncProvider><Probe /></DeviceSyncProvider>);
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
        open();
        expect(screen.getByText("Alone")).toBeTruthy();
        await waitFor(() => expect(screen.getByText(/No other device is online in this shop/)).toBeTruthy());
    });

    it("shows a device the server can see but that is not linked, and why", async () => {
        localStorage.setItem("terminal_device_id", BIG_ID);
        globalThis.RTCPeerConnection = class {};
        pollReturns({ peers: [{ device_id: PEER, name: "Kitchen", can_print: true }], messages: [] });
        render(<DeviceSyncProvider><Probe /></DeviceSyncProvider>);
        await waitFor(() => expect(screen.getByText("1 found, not linked")).toBeTruthy());
        open();
        expect(screen.getByText("Kitchen")).toBeTruthy();
        expect(screen.getByText("Not linked")).toBeTruthy();
        expect(screen.getByText(/Seen by the server/)).toBeTruthy();
        expect(screen.getByText(/could not be opened/)).toBeTruthy();
        delete globalThis.RTCPeerConnection;
    });

    it("tells the user when the browser has no WebRTC", async () => {
        localStorage.setItem("terminal_device_id", BIG_ID);
        delete globalThis.RTCPeerConnection;
        pollReturns({ peers: [{ device_id: PEER, name: "Kitchen", can_print: false }], messages: [] });
        render(<DeviceSyncProvider><Probe /></DeviceSyncProvider>);
        await waitFor(() => expect(screen.getByText("1 found, not linked")).toBeTruthy());
        open();
        expect(screen.getByText(/does not support WebRTC/)).toBeTruthy();
    });

    it("shows a clear message when the server refuses the device", async () => {
        pollReturns({}, false, 403);
        render(<DeviceSyncProvider><Probe /></DeviceSyncProvider>);
        await waitFor(() => expect(screen.getByText("Not allowed")).toBeTruthy());
        open();
        expect(screen.getByText(/refused this device \(HTTP 403\)/)).toBeTruthy();
    });

    it("says the server cannot be reached when requests fail", async () => {
        globalThis.RTCPeerConnection = class {};
        globalThis.fetch = vi.fn(async () => { throw new Error("Failed to fetch"); });
        render(<DeviceSyncProvider><Probe /></DeviceSyncProvider>);
        await waitFor(() => expect(screen.getByText("No server")).toBeTruthy());
        open();
        expect(screen.getByText(/Cannot reach the server/)).toBeTruthy();
    });

    it("Copy diagnostics produces a report with the device, the browser and the event log", async () => {
        pollReturns({ peers: [], messages: [] });
        render(<DeviceSyncProvider><Probe /></DeviceSyncProvider>);
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
        open();
        fireEvent.click(screen.getByText("Copy diagnostics"));
        const box = await waitFor(() => {
            const el = document.querySelector("textarea");
            expect(el).toBeTruthy();
            return el;
        });
        const report = JSON.parse(box.value);
        expect(report.device.id).toBe(localStorage.getItem("terminal_device_id"));
        expect(report.browser).toHaveProperty("hasRTCPeerConnection");
        expect(report.log.length).toBeGreaterThan(0);
    });
});
});
