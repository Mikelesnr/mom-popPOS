// Kitchen categories, the kitchen device, automatic receipts and the manager
// setting, including end to end through the real checkout buttons.

import "fake-indexeddb/auto";
import React from "react";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { __state } from "@inertiajs/react";
import { calls as toastCalls } from "react-hot-toast";
import { printed } from "react-to-print";
import DeviceSyncProvider, { useDeviceSync } from "@/Components/Devices/DeviceSyncProvider";
import { KitchenTicket } from "@/Components/Sales/KitchenTicket";
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

const user = (over = {}) => ({ id: "u1", name: "Tendai", shop_id: "shop-1", role: "cashier", ...over });

let serverSettings;
let patchCalls;
const mockServer = ({ patchStatus = 200, patchThrows = false } = {}) => {
    globalThis.fetch = vi.fn(async (url, init) => {
        if (url === "/devices/poll") {
            return { ok: true, status: 200, json: async () => ({ peers: [], messages: [], shop_settings: serverSettings }) };
        }
        if (String(url).endsWith("/print-settings")) {
            if (patchThrows) throw new TypeError("Failed to fetch");
            patchCalls.push({ url, init });
            if (patchStatus !== 200) return { ok: false, status: patchStatus, json: async () => ({}) };
            serverSettings = { ...serverSettings, auto_print_receipts: JSON.parse(init.body).auto_print_receipts };
            return { ok: true, status: 200, json: async () => serverSettings };
        }
        return { ok: true, status: 200, json: async () => ({}) };
    });
};

const kitchenItem = (over = {}) => ({
    cartItemId: crypto.randomUUID(), product_id: "p-chips", name: "Chips", quantity: 2,
    unit_price: 2, subtotal: 4, metadata: { type: "unit" }, is_kitchen: true, placed: 0, ...over,
});
const barItem = (over = {}) => ({
    cartItemId: crypto.randomUUID(), product_id: "p-castle", name: "Castle Lager", quantity: 1,
    unit_price: 2.6, subtotal: 2.6, metadata: { type: "unit" }, is_kitchen: false, placed: 0, ...over,
});

beforeEach(async () => {
    localStorage.clear();
    toastCalls.length = 0;
    printed.length = 0;
    ctx = null;
    serverSettings = { auto_print_receipts: false, kitchen_category_ids: [] };
    patchCalls = [];
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

const becomeKitchen = async () => {
    act(() => ctx.setKitchen(true));
    await waitFor(() => expect(ctx.isKitchen).toBe(true));
};
const waitForSettings = (check) => waitFor(() => expect(check(ctx.shopSettings)).toBe(true));

// ---------------------------------------------------------------- the slip
describe("kitchen ticket", () => {
    it("shows the table name, who rang it, the time, and only what to cook (no prices)", () => {
        const { container } = render(
            <KitchenTicket shopName="Harare Central" tableName="Window seat" staff="Tendai" time="19:42"
                items={[{ quantity: 2, name: "Chips", metadata: { type: "unit" } }, { quantity: 1, name: "Gin", metadata: { type: "double" } }]} isUpdate />,
        );
        const text = container.textContent;
        expect(text).toContain("TABLE");
        expect(text).toContain("Window seat");
        expect(text).toContain("ADD TO TABLE");
        expect(text).toContain("Tendai");
        expect(text).toContain("19:42");
        expect(text).toContain("2x");
        expect(text).toContain("Gin (double)");
        expect(text).not.toMatch(/\$\d/);
    });

    it("shows the order number for a fast sale", () => {
        const { container } = render(<KitchenTicket shopName="S" orderNo={14} staff="Farai" time="12:01" items={[{ quantity: 1, name: "Burger" }]} />);
        expect(container.textContent).toContain("ORDER");
        expect(container.textContent).toContain("#14");
        expect(container.textContent).toContain("NEW ORDER");
        expect(container.textContent).toContain("Farai");
    });
});

// ------------------------------------------------------- the kitchen device
describe("kitchen device", () => {
    it("the toggle is saved and shown, and does not turn the device into a bill printer", async () => {
        mount();
        fireEvent.click(screen.getByLabelText("Devices in this shop"));
        fireEvent.click(screen.getByLabelText("This is the kitchen device"));
        await waitFor(() => expect(ctx.isKitchen).toBe(true));
        expect(localStorage.getItem("terminal_is_kitchen")).toBe("1");
        expect(screen.getByText(/Items from kitchen categories print here automatically/)).toBeTruthy();
        expect(ctx.canPrint).toBe(false);
        expect(ctx.printers).toEqual([]); // bills still print where they are rung
    });

    it("there is no kitchen printer picker any more", () => {
        mount();
        fireEvent.click(screen.getByLabelText("Devices in this shop"));
        expect(screen.queryByText("Send kitchen tickets to")).toBeNull();
        expect(screen.getByText("Print bills on")).toBeTruthy();
    });

    it("sends only kitchen-category items, with the table name and staff, and leaves the rest of the bill alone", async () => {
        mount();
        await becomeKitchen();
        const sent = ctx.printKitchenTicket({ tableName: "Window seat", items: [kitchenItem(), barItem()], isUpdate: true });
        expect(sent).toBe(true);
        await waitFor(() => expect(printed.length).toBe(1));
        const html = printed[0].html;
        expect(printed[0].title).toBe("Kitchen Window seat");
        expect(html).toContain("Window seat");
        expect(html).toContain("Tendai");
        expect(html).toContain("Chips");
        expect(html).not.toContain("Castle");
        expect(html).not.toMatch(/\$\d/);
    });

    it("an order with kitchen items prints the order number", async () => {
        mount();
        await becomeKitchen();
        ctx.printKitchenTicket({ orderNo: 14, items: [kitchenItem()] });
        await waitFor(() => expect(printed.length).toBe(1));
        expect(printed[0].html).toContain("#14");
        expect(printed[0].html).toContain("ORDER");
    });

    it("prints nothing, and says nothing, when no item in the order is a kitchen item", async () => {
        mount();
        await becomeKitchen();
        expect(ctx.printKitchenTicket({ tableName: "T1", items: [barItem()] })).toBe(false);
        await new Promise((r) => setTimeout(r, 120));
        expect(printed.length).toBe(0);
        expect(toastCalls.length).toBe(0);
    });

    it("warns loudly, and never falls back to this printer, when no kitchen device is linked", async () => {
        mount();
        await waitFor(() => expect(ctx).not.toBeNull());
        expect(ctx.printKitchenTicket({ tableName: "T1", items: [kitchenItem()] })).toBe(false);
        expect(toastCalls.some((c) => c.kind === "error" && /No kitchen device is linked. Kitchen ticket NOT printed/.test(c.msg))).toBe(true);
        await new Promise((r) => setTimeout(r, 120));
        expect(printed.length).toBe(0);
    });

    it("names a kitchen that was seen before but is offline", async () => {
        localStorage.setItem("terminal_known_kitchens", JSON.stringify([{ id: "k1", name: "Hot kitchen" }]));
        mount();
        await waitFor(() => expect(ctx).not.toBeNull());
        ctx.printKitchenTicket({ tableName: "T1", items: [kitchenItem()] });
        expect(toastCalls.some((c) => c.kind === "error" && /Hot kitchen is offline. Kitchen ticket NOT printed/.test(c.msg))).toBe(true);
    });
});

// -------------------------------------------------------- kitchen categories
describe("kitchen categories", () => {
    it("uses the live list from the server once known, and the catalog flag only until then", async () => {
        // hold the first poll back so "before the server has answered" is real
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

        // before the server has answered: the flag that came with the catalog
        expect(ctx.isKitchenCategory({ id: "c1", is_kitchen: true })).toBe(true);
        expect(ctx.isKitchenCategory({ id: "c2", is_kitchen: false })).toBe(false);
        expect(ctx.isKitchenCategory(undefined)).toBe(false);

        serverSettings = { auto_print_receipts: false, kitchen_category_ids: ["c2"] };
        release();
        await waitForSettings((s) => s.kitchenCategoryIds?.[0] === "c2");

        // the server list wins, so a category switched on or off mid-shift is right within seconds
        expect(ctx.isKitchenCategory({ id: "c1", is_kitchen: true })).toBe(false);
        expect(ctx.isKitchenCategory({ id: "c2", is_kitchen: false })).toBe(true);
        expect(JSON.parse(localStorage.getItem("terminal_shop_settings")).kitchenCategoryIds).toEqual(["c2"]);
    });

    it("keeps the last known settings when the server cannot be reached", async () => {
        localStorage.setItem("terminal_shop_settings", JSON.stringify({ autoPrintReceipts: true, kitchenCategoryIds: ["c9"] }));
        globalThis.fetch = vi.fn(async () => { throw new TypeError("Failed to fetch"); });
        mount();
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
        expect(ctx.shopSettings).toEqual({ autoPrintReceipts: true, kitchenCategoryIds: ["c9"] });
        expect(ctx.isKitchenCategory({ id: "c9" })).toBe(true);
    });
});

// ------------------------------------------------------ automatic receipts
describe("automatic receipt", () => {
    const receipt = (over = {}) => ({
        title: "Receipt #3", date: "18/11/2026", staff: "Tendai", customer: null,
        items: [barItem(), kitchenItem()], totals: { total: 6.6, cash: 10, change: 3.4 }, ...over,
    });

    it("does nothing while the shop setting is off", async () => {
        mount();
        await waitFor(() => expect(ctx).not.toBeNull());
        expect(ctx.autoPrintReceipt(receipt())).toBe(false);
        await new Promise((r) => setTimeout(r, 120));
        expect(printed.length).toBe(0);
    });

    it("prints the whole bill (kitchen and bar items together) once a manager turns it on", async () => {
        serverSettings = { auto_print_receipts: true, kitchen_category_ids: [] };
        mount();
        await waitForSettings((s) => s.autoPrintReceipts === true);
        expect(ctx.autoPrintReceipt(receipt())).toBe(true);
        await waitFor(() => expect(printed.length).toBe(1));
        const html = printed[0].html;
        expect(html).toContain("Castle Lager");
        expect(html).toContain("Chips");
        expect(html).toContain("CHANGE");
        expect(html).toContain("$3.40");
    });

    it("falls back to this device, with a message, if the chosen bill printer is offline", async () => {
        serverSettings = { auto_print_receipts: true, kitchen_category_ids: [] };
        mount();
        await waitForSettings((s) => s.autoPrintReceipts === true);
        act(() => ctx.setRoute("bill", "11111111-1111-4111-8111-111111111111"));
        await waitFor(() => expect(ctx.routes.bill).toBeTruthy());
        ctx.autoPrintReceipt(receipt());
        expect(toastCalls.some((c) => c.kind === "error" && /offline. Printing the receipt on this device instead/.test(c.msg))).toBe(true);
        await waitFor(() => expect(printed.length).toBe(1));
    });
});

// ------------------------------------------------------ the manager setting
describe("manager setting: print receipts automatically", () => {
    const openPanel = () => fireEvent.click(screen.getByLabelText("Devices in this shop"));
    const settingBox = () => screen.getByLabelText(/Print the customer's receipt automatically/);

    it.each(["manager", "shop_manager"])("is shown to a %s", async (role) => {
        __state.props = { auth: { user: user({ role }) } };
        mount();
        openPanel();
        expect(settingBox()).toBeTruthy();
    });

    it.each(["cashier", "bartender"])("is not shown to a %s", async (role) => {
        __state.props = { auth: { user: user({ role }) } };
        mount();
        openPanel();
        expect(screen.queryByLabelText(/Print the customer's receipt automatically/)).toBeNull();
    });

    it("saves to the server, then applies on this device", async () => {
        __state.props = { auth: { user: user({ role: "shop_manager" }) } };
        mount();
        openPanel();
        fireEvent.click(settingBox());
        await waitFor(() => expect(ctx.shopSettings.autoPrintReceipts).toBe(true));
        expect(patchCalls.length).toBe(1);
        expect(patchCalls[0].url).toBe("/shops/shop-1/print-settings");
        expect(patchCalls[0].init.method).toBe("PATCH");
        expect(JSON.parse(patchCalls[0].init.body)).toEqual({ auto_print_receipts: true });
        expect(toastCalls.some((c) => c.kind === "success" && /print automatically/.test(c.msg))).toBe(true);
    });

    it("does not change anything when the server refuses", async () => {
        mockServer({ patchStatus: 403 });
        __state.props = { auth: { user: user({ role: "manager" }) } };
        mount();
        openPanel();
        fireEvent.click(settingBox());
        await waitFor(() => expect(toastCalls.some((c) => c.kind === "error" && /Only managers can change this setting/.test(c.msg))).toBe(true));
        expect(ctx.shopSettings.autoPrintReceipts).toBe(false);
    });

    it("explains that it needs internet when the server cannot be reached", async () => {
        mockServer({ patchThrows: true });
        __state.props = { auth: { user: user({ role: "manager" }) } };
        mount();
        openPanel();
        fireEvent.click(settingBox());
        await waitFor(() => expect(toastCalls.some((c) => c.kind === "error" && /needs an internet connection/.test(c.msg))).toBe(true));
        expect(ctx.shopSettings.autoPrintReceipts).toBe(false);
    });
});

// ----------------------------------------- end to end through the checkout buttons
describe("Fast Sale", () => {
    const auth = { user: user() };
    const sell = async (cart) => {
        const onClear = vi.fn();
        const total = cart.reduce((s, i) => s + i.subtotal, 0);
        mount(<CheckoutOrderButton cart={cart} auth={auth} onClearCart={onClear} cartTotal={total} />);
        fireEvent.click(screen.getByText(/^Fast Sale/));
        fireEvent.click(await screen.findByText("Save Sale"));
        await waitFor(() => expect(onClear).toHaveBeenCalled());
        return onClear;
    };

    beforeEach(() => localStorage.setItem("terminal_shift_id", "shift-1"));

    it("sends the kitchen items to the kitchen and the whole bill to the customer, with the order number", async () => {
        localStorage.setItem("terminal_is_kitchen", "1");
        serverSettings = { auto_print_receipts: true, kitchen_category_ids: [] };
        mount();
        await waitForSettings((s) => s.autoPrintReceipts === true);
        cleanup();

        await sell([kitchenItem(), barItem()]);
        await waitFor(() => expect(printed.length).toBe(2));

        const kitchen = printed.find((p) => p.title.startsWith("Kitchen"));
        const bill = printed.find((p) => p.title.startsWith("Receipt"));
        expect(kitchen.html).toContain("#1");
        expect(kitchen.html).toContain("Tendai");
        expect(kitchen.html).toContain("Chips");
        expect(kitchen.html).not.toContain("Castle");
        expect(bill.title).toBe("Receipt #1");
        expect(bill.html).toContain("Chips");
        expect(bill.html).toContain("Castle Lager");

        const [order] = await db.orders.toArray();
        expect(order.order_no).toBe(1);
        const items = await db.order_items.toArray();
        expect(items.find((i) => i.name === "Chips").is_kitchen).toBe(true);
        expect(items.find((i) => i.name === "Castle Lager").is_kitchen).toBe(false);
    });

    it("prints only the kitchen ticket when automatic receipts are off, as before", async () => {
        localStorage.setItem("terminal_is_kitchen", "1");
        await sell([kitchenItem(), barItem()]);
        await waitFor(() => expect(printed.length).toBe(1));
        await new Promise((r) => setTimeout(r, 150));
        expect(printed.length).toBe(1);
        expect(printed[0].title.startsWith("Kitchen")).toBe(true);
    });

    it("prints nothing at all for a bar-only sale when automatic receipts are off", async () => {
        const onClear = await sell([barItem()]);
        expect(onClear).toHaveBeenCalled();
        await new Promise((r) => setTimeout(r, 150));
        expect(printed.length).toBe(0);
        expect(toastCalls.some((c) => c.kind === "error")).toBe(false);
    });

    it("still records the sale when there is no kitchen device, and warns", async () => {
        await sell([kitchenItem()]);
        expect((await db.orders.toArray()).length).toBe(1);
        expect(toastCalls.some((c) => c.kind === "error" && /Kitchen ticket NOT printed/.test(c.msg))).toBe(true);
        expect(printed.length).toBe(0);
    });

    it("numbers orders one after another within a shift", async () => {
        await sell([barItem()]);
        cleanup();
        await sell([barItem()]);
        const orders = (await db.orders.toArray()).sort((a, b) => a.order_no - b.order_no);
        expect(orders.map((o) => o.order_no)).toEqual([1, 2]);
    });
});

describe("Open Table", () => {
    it("sends the kitchen items to the kitchen under the table name and leaves bar items off the ticket", async () => {
        localStorage.setItem("terminal_shift_id", "shift-1");
        localStorage.setItem("terminal_is_kitchen", "1");
        const onClear = vi.fn();
        mount(<CheckoutTableButton cart={[kitchenItem(), barItem()]} auth={{ user: user() }} onClearCart={onClear} />);

        fireEvent.click(screen.getByText("Open Table"));
        fireEvent.change(await screen.findByPlaceholderText(/Table 5/), { target: { value: "Window seat" } });
        fireEvent.click(screen.getByText("Confirm"));

        await waitFor(() => expect(onClear).toHaveBeenCalled());
        await waitFor(() => expect(printed.length).toBe(1));
        expect(printed[0].title).toBe("Kitchen Window seat");
        expect(printed[0].html).toContain("TABLE");
        expect(printed[0].html).toContain("Window seat");
        expect(printed[0].html).toContain("NEW ORDER");
        expect(printed[0].html).toContain("Chips");
        expect(printed[0].html).not.toContain("Castle");

        const items = await db.order_items.toArray();
        expect(items.length).toBe(2); // the table keeps every item
        expect(items.find((i) => i.name === "Chips").is_kitchen).toBe(true);
    });
});

describe("Update Table and Close Table", () => {
    const table = { id: "table-1", shop_id: "shop-1", shift_id: "shift-1", user_id: "u1", name: "Window seat", total_amount: 4, status: "open", created_at: new Date().toISOString() };

    const renderCart = (cart) => {
        const setCart = vi.fn();
        const setActiveTable = vi.fn();
        mount(<TicketCart cart={cart} auth={{ user: user() }} setCart={setCart} activeTable={table} setActiveTable={setActiveTable} onPrint={() => {}} />);
        return { setCart, setActiveTable };
    };

    beforeEach(async () => {
        localStorage.setItem("terminal_shift_id", "shift-1");
        await saveTableLocal(table);
        await saveOrderItemLocal({ id: "old-1", orderable_id: table.id, product_id: "p-chips", name: "Chips", quantity: 2, unit_price: 2, subtotal: 4, is_kitchen: true });
    });

    it("adding to a table sends only the NEW kitchen items to the kitchen", async () => {
        localStorage.setItem("terminal_is_kitchen", "1");
        const earlier = kitchenItem({ name: "Chips", placed: 1 });
        const newKitchen = kitchenItem({ name: "Wings", product_id: "p-wings", quantity: 1, subtotal: 5, unit_price: 5 });
        const newBar = barItem();
        renderCart([earlier, newKitchen, newBar]);

        fireEvent.click(screen.getByText("Update Table"));
        await waitFor(() => expect(printed.length).toBe(1));
        expect(printed[0].html).toContain("Window seat");
        expect(printed[0].html).toContain("ADD TO TABLE");
        expect(printed[0].html).toContain("Wings");
        expect(printed[0].html).not.toContain("Chips"); // already sent earlier
        expect(printed[0].html).not.toContain("Castle");

        const stored = await db.order_items.where("orderable_id").equals(table.id).toArray();
        expect(stored.map((i) => i.name).sort()).toEqual(["Castle Lager", "Chips", "Wings"]);
    });

    it("closing a table prints the whole bill automatically when the shop setting is on", async () => {
        serverSettings = { auto_print_receipts: true, kitchen_category_ids: [] };
        const cart = [kitchenItem({ placed: 1 }), barItem({ placed: 1 })];
        const { setActiveTable } = renderCart(cart);
        await waitForSettings((s) => s.autoPrintReceipts === true);

        fireEvent.click(screen.getByText("Close Table"));
        fireEvent.click(await screen.findByText("Save Sale"));

        await waitFor(() => expect(setActiveTable).toHaveBeenCalledWith(null));
        await waitFor(() => expect(printed.length).toBe(1));
        expect(printed[0].title).toBe("Receipt");
        expect(printed[0].html).toContain("Window seat");
        expect(printed[0].html).toContain("Chips");
        expect(printed[0].html).toContain("Castle Lager");
        expect((await db.open_tables.get(table.id)).status).toBe("closed");
    });

    it("closing a table prints nothing automatically when the setting is off", async () => {
        const { setActiveTable } = renderCart([kitchenItem({ placed: 1 })]);
        fireEvent.click(screen.getByText("Close Table"));
        fireEvent.click(await screen.findByText("Save Sale"));
        await waitFor(() => expect(setActiveTable).toHaveBeenCalledWith(null));
        await new Promise((r) => setTimeout(r, 150));
        expect(printed.length).toBe(0);
    });
});
