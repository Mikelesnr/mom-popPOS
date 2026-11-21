// Bar slips: a slip prints on the bar device when someone who is not working
// in the bar rings up bar items.

import "fake-indexeddb/auto";
import React from "react";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { __state } from "@inertiajs/react";
import { calls as toastCalls } from "react-hot-toast";
import { printed } from "react-to-print";
import DeviceSyncProvider, { useDeviceSync } from "@/Components/Devices/DeviceSyncProvider";
import CheckoutOrderButton from "@/Components/Sales/CheckoutOrderButton";
import CheckoutTableButton from "@/Components/Sales/CheckoutTableButton";
import TicketCart from "@/Components/Sales/Partials/TicketCart";
import { db, saveTableLocal, saveOrderItemLocal } from "@/Utils/db";
import { stopEngine } from "@/Sync/engine";

let ctx = null;
const Probe = () => {
    ctx = useDeviceSync();
    return null;
};

const user = (over = {}) => ({ id: "u1", name: "Tendai", shop_id: "shop-1", role: "waiter", ...over });

let serverSettings;
const mockServer = () => {
    globalThis.fetch = vi.fn(async (url) => {
        if (url === "/devices/poll") {
            return { ok: true, status: 200, json: async () => ({ peers: [], messages: [], shop_settings: serverSettings }) };
        }
        return { ok: true, status: 200, json: async () => ({}) };
    });
};

const barItem = (over = {}) => ({
    cartItemId: crypto.randomUUID(), product_id: "p-castle", name: "Castle Lager", quantity: 2,
    unit_price: 2.6, subtotal: 5.2, metadata: { type: "unit" }, is_kitchen: false, is_bar: true, placed: 0, ...over,
});
const foodItem = (over = {}) => ({
    cartItemId: crypto.randomUUID(), product_id: "p-chips", name: "Chips", quantity: 1,
    unit_price: 2, subtotal: 2, metadata: { type: "unit" }, is_kitchen: true, is_bar: false, placed: 0, ...over,
});
const otherItem = (over = {}) => ({
    cartItemId: crypto.randomUUID(), product_id: "p-airtime", name: "Airtime", quantity: 1,
    unit_price: 1, subtotal: 1, metadata: { type: "unit" }, is_kitchen: false, is_bar: false, placed: 0, ...over,
});

beforeEach(async () => {
    localStorage.clear();
    toastCalls.length = 0;
    printed.length = 0;
    ctx = null;
    serverSettings = { auto_print_receipts: false, kitchen_category_ids: [], bar_category_ids: [] };
    __state.props = { auth: { user: user() } };
    globalThis.RTCPeerConnection = class {};
    mockServer();
    await Promise.all([db.orders.clear(), db.open_tables.clear(), db.order_items.clear()]);
});
afterEach(() => {
    cleanup();
    stopEngine();
    delete globalThis.RTCPeerConnection;
});

const mount = (extra = null) =>
    render(
        <DeviceSyncProvider>
            <Probe />
            {extra}
        </DeviceSyncProvider>,
    );

const asBarDevice = async () => {
    act(() => ctx.setBar(true));
    await waitFor(() => expect(ctx.isBar).toBe(true));
};

describe("the bar device", () => {
    it("the toggle is saved, shown, and does not make it a bill printer or the kitchen", async () => {
        mount();
        fireEvent.click(screen.getByLabelText("Devices in this shop"));
        fireEvent.click(screen.getByLabelText("This is the bar device"));
        await waitFor(() => expect(ctx.isBar).toBe(true));
        expect(localStorage.getItem("terminal_is_bar")).toBe("1");
        expect(screen.getByText(/a slip prints here so nothing/)).toBeTruthy();
        expect(ctx.canPrint).toBe(false);
        expect(ctx.isKitchen).toBe(false);
        expect(ctx.printers).toEqual([]);
    });

    it("a waiter's bar items print a slip with the table name and the waiter's name, and nothing else", async () => {
        mount();
        await asBarDevice();
        // a kitchen item and a non-station item are in the same order
        expect(ctx.printBarSlip({ tableName: "Window seat", items: [barItem(), foodItem(), otherItem()], isUpdate: true })).toBe(true);
        await waitFor(() => expect(printed.length).toBe(1));
        const html = printed[0].html;
        expect(printed[0].title).toBe("Bar Window seat");
        expect(html).toContain("BAR");
        expect(html).toContain("Window seat");
        expect(html).toContain("ADD TO TABLE");
        expect(html).toContain("Tendai");
        expect(html).toContain("Castle Lager");
        expect(html).toContain("2x");
        expect(html).not.toContain("Chips");
        expect(html).not.toContain("Airtime");
        expect(html).not.toMatch(/\$\d/);
    });

    it("a fast sale prints the order number", async () => {
        mount();
        await asBarDevice();
        ctx.printBarSlip({ orderNo: 7, items: [barItem()] });
        await waitFor(() => expect(printed.length).toBe(1));
        expect(printed[0].html).toContain("#7");
        expect(printed[0].html).toContain("ORDER");
        expect(printed[0].html).toContain("NEW ORDER");
    });

    it("prints nothing when no item in the order is a bar item", async () => {
        mount();
        await asBarDevice();
        expect(ctx.printBarSlip({ tableName: "T1", items: [foodItem(), otherItem()] })).toBe(false);
        await new Promise((r) => setTimeout(r, 120));
        expect(printed.length).toBe(0);
        expect(toastCalls.length).toBe(0);
    });

    it("warns loudly when no bar device is linked, naming a bar seen before", async () => {
        mount();
        await waitFor(() => expect(ctx).not.toBeNull());
        expect(ctx.printBarSlip({ tableName: "T1", items: [barItem()] })).toBe(false);
        expect(toastCalls.some((c) => c.kind === "error" && /No bar device is linked. Bar slip NOT printed/.test(c.msg))).toBe(true);
        cleanup(); stopEngine(); toastCalls.length = 0;

        localStorage.setItem("terminal_known_bars", JSON.stringify([{ id: "b1", name: "Main bar" }]));
        mount();
        await waitFor(() => expect(ctx).not.toBeNull());
        ctx.printBarSlip({ tableName: "T1", items: [barItem()] });
        expect(toastCalls.some((c) => c.kind === "error" && /Main bar is offline. Bar slip NOT printed/.test(c.msg))).toBe(true);
    });
});

describe("who triggers a bar slip", () => {
    const rings = async (role, { inBar = false } = {}) => {
        __state.props = { auth: { user: user({ role }) } };
        mount();
        await asBarDevice(); // this device is also the bar, so a slip would print right here
        if (inBar) {
            fireEvent.click(screen.getByLabelText("Devices in this shop"));
            fireEvent.click(screen.getByText("In the bar"));
            await waitFor(() => expect(ctx.inBar).toBe(true));
        }
        const sent = ctx.printBarSlip({ tableName: "T1", items: [barItem()] });
        await new Promise((r) => setTimeout(r, 150));
        return { sent, printedCount: printed.length };
    };

    it.each(["waiter", "cashier", "staff"])("a %s triggers a slip", async (role) => {
        const r = await rings(role);
        expect(r).toEqual({ sent: true, printedCount: 1 });
    });

    it("a bartender never does", async () => {
        const r = await rings("bartender");
        expect(r).toEqual({ sent: false, printedCount: 0 });
        expect(toastCalls.some((c) => c.kind === "error")).toBe(false);
    });

    it.each(["manager", "shop_manager"])("a %s on the floor does", async (role) => {
        const r = await rings(role);
        expect(r).toEqual({ sent: true, printedCount: 1 });
    });

    it.each(["manager", "shop_manager"])("a %s working in the bar does not", async (role) => {
        const r = await rings(role, { inBar: true });
        expect(r).toEqual({ sent: false, printedCount: 0 });
    });

    it("only managers see the floor / bar switch", async () => {
        for (const role of ["waiter", "cashier", "bartender"]) {
            __state.props = { auth: { user: user({ role }) } };
            const { unmount } = mount();
            fireEvent.click(screen.getByLabelText("Devices in this shop"));
            expect(screen.queryByText("Where are you working?")).toBeNull();
            unmount();
            stopEngine();
        }
        __state.props = { auth: { user: user({ role: "manager" }) } };
        mount();
        fireEvent.click(screen.getByLabelText("Devices in this shop"));
        expect(screen.getByText("Where are you working?")).toBeTruthy();
    });

    it("a manager's choice is remembered for that manager on this device, and is theirs alone", async () => {
        __state.props = { auth: { user: user({ id: "m1", role: "manager" }) } };
        mount();
        fireEvent.click(screen.getByLabelText("Devices in this shop"));
        fireEvent.click(screen.getByText("In the bar"));
        await waitFor(() => expect(ctx.inBar).toBe(true));
        expect(localStorage.getItem("terminal_in_bar:m1")).toBe("1");
        cleanup(); stopEngine();

        // the same manager comes back: still in the bar
        mount();
        expect(ctx.inBar).toBe(true);
        cleanup(); stopEngine();

        // a different manager on the same device starts on the floor
        __state.props = { auth: { user: user({ id: "m2", role: "shop_manager" }) } };
        mount();
        expect(ctx.inBar).toBe(false);
    });
});

describe("bar categories", () => {
    it("uses the live list from the server once known, and the catalog flag only until then", async () => {
        let release;
        const gate = new Promise((r) => (release = r));
        globalThis.fetch = vi.fn(async (url) => {
            if (url === "/devices/poll") {
                await gate;
                return { ok: true, status: 200, json: async () => ({ peers: [], messages: [], shop_settings: serverSettings }) };
            }
            return { ok: true, status: 200, json: async () => ({}) };
        });
        mount();
        await waitFor(() => expect(ctx).not.toBeNull());
        expect(ctx.isBarCategory({ id: "c1", is_bar: true })).toBe(true);
        expect(ctx.isBarCategory({ id: "c2", is_bar: false })).toBe(false);
        expect(ctx.isBarCategory(undefined)).toBe(false);

        serverSettings = { auto_print_receipts: false, kitchen_category_ids: [], bar_category_ids: ["c2"] };
        release();
        await waitFor(() => expect(ctx.shopSettings.barCategoryIds).toEqual(["c2"]));
        expect(ctx.isBarCategory({ id: "c1", is_bar: true })).toBe(false);
        expect(ctx.isBarCategory({ id: "c2", is_bar: false })).toBe(true);
        expect(JSON.parse(localStorage.getItem("terminal_shop_settings")).barCategoryIds).toEqual(["c2"]);
    });
});

// ------------------------------- end to end through the real checkout buttons
describe("Fast Sale, Open Table and Update Table", () => {
    beforeEach(() => localStorage.setItem("terminal_shift_id", "shift-1"));

    it("a waiter's Fast Sale sends the kitchen items to the kitchen and the bar items to the bar", async () => {
        localStorage.setItem("terminal_is_kitchen", "1");
        localStorage.setItem("terminal_is_bar", "1");
        const onClear = vi.fn();
        const cart = [barItem(), foodItem(), otherItem()];
        mount(<CheckoutOrderButton cart={cart} auth={{ user: user() }} onClearCart={onClear} cartTotal={8.2} />);
        fireEvent.click(screen.getByText(/^Fast Sale/));
        fireEvent.click(await screen.findByText("Save Sale"));
        await waitFor(() => expect(onClear).toHaveBeenCalled());
        await waitFor(() => expect(printed.length).toBe(2));

        const kitchen = printed.find((p) => p.title.startsWith("Kitchen"));
        const bar = printed.find((p) => p.title.startsWith("Bar"));
        expect(kitchen.html).toContain("Chips");
        expect(kitchen.html).not.toContain("Castle");
        expect(bar.html).toContain("Castle Lager");
        expect(bar.html).toContain("#1");
        expect(bar.html).toContain("Tendai");
        expect(bar.html).not.toContain("Chips");
        expect(bar.html).not.toContain("Airtime");

        const items = await db.order_items.toArray();
        expect(items.find((i) => i.name === "Castle Lager").is_bar).toBe(true);
        expect(items.find((i) => i.name === "Chips").is_bar).toBe(false);
    });

    it("a bartender's own Fast Sale prints no bar slip, and the sale is unaffected", async () => {
        __state.props = { auth: { user: user({ role: "bartender" }) } };
        localStorage.setItem("terminal_is_bar", "1");
        const onClear = vi.fn();
        mount(<CheckoutOrderButton cart={[barItem()]} auth={{ user: user({ role: "bartender" }) }} onClearCart={onClear} cartTotal={5.2} />);
        fireEvent.click(screen.getByText(/^Fast Sale/));
        fireEvent.click(await screen.findByText("Save Sale"));
        await waitFor(() => expect(onClear).toHaveBeenCalled());
        await new Promise((r) => setTimeout(r, 150));
        expect(printed.length).toBe(0);
        expect((await db.orders.toArray()).length).toBe(1);
        expect(toastCalls.some((c) => c.kind === "error")).toBe(false);
    });

    it("a sale is still saved when there is no bar device, and a waiter is warned", async () => {
        const onClear = vi.fn();
        mount(<CheckoutOrderButton cart={[barItem()]} auth={{ user: user() }} onClearCart={onClear} cartTotal={5.2} />);
        fireEvent.click(screen.getByText(/^Fast Sale/));
        fireEvent.click(await screen.findByText("Save Sale"));
        await waitFor(() => expect(onClear).toHaveBeenCalled());
        expect((await db.orders.toArray()).length).toBe(1);
        expect(toastCalls.some((c) => c.kind === "error" && /Bar slip NOT printed/.test(c.msg))).toBe(true);
    });

    it("Open Table sends the bar items under the table name", async () => {
        localStorage.setItem("terminal_is_bar", "1");
        const onClear = vi.fn();
        mount(<CheckoutTableButton cart={[barItem(), foodItem()]} auth={{ user: user() }} onClearCart={onClear} />);
        fireEvent.click(screen.getByText("Open Table"));
        fireEvent.change(await screen.findByPlaceholderText(/Table 5/), { target: { value: "Patio 2" } });
        fireEvent.click(screen.getByText("Confirm"));
        await waitFor(() => expect(onClear).toHaveBeenCalled());
        await waitFor(() => expect(printed.length).toBe(1));
        expect(printed[0].title).toBe("Bar Patio 2");
        expect(printed[0].html).toContain("TABLE");
        expect(printed[0].html).toContain("Castle Lager");
        expect(printed[0].html).not.toContain("Chips");
    });

    it("Update Table sends only the NEW bar items", async () => {
        localStorage.setItem("terminal_is_bar", "1");
        const table = { id: "table-1", shop_id: "shop-1", shift_id: "shift-1", user_id: "u1", name: "Patio 2", total_amount: 5.2, status: "open", created_at: new Date().toISOString() };
        await saveTableLocal(table);
        await saveOrderItemLocal({ id: "old", orderable_id: table.id, product_id: "p-castle", name: "Castle Lager", quantity: 2, unit_price: 2.6, subtotal: 5.2, is_bar: true });
        const earlier = barItem({ placed: 1 });
        const another = barItem({ name: "Black Label", product_id: "p-bl", quantity: 1, subtotal: 2.8, unit_price: 2.8 });
        mount(<TicketCart cart={[earlier, another]} auth={{ user: user() }} setCart={vi.fn()} activeTable={table} setActiveTable={vi.fn()} onPrint={() => {}} />);
        fireEvent.click(screen.getByText("Update Table"));
        await waitFor(() => expect(printed.length).toBe(1));
        expect(printed[0].html).toContain("Black Label");
        expect(printed[0].html).not.toContain("Castle");
        expect(printed[0].html).toContain("ADD TO TABLE");
    });
});
