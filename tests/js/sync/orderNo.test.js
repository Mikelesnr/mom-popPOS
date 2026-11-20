// Order numbers used on kitchen tickets, against the real Utils/db helpers.
import "fake-indexeddb/auto";
import { db, nextOrderNo, saveOrderLocal } from "../../../resources/js/Utils/db";

const order = (shift, over = {}) => ({
    id: crypto.randomUUID(), shop_id: "s", shift_id: shift, user_id: "u",
    total_amount: 1, payment_method: "cash", status: "paid", ...over,
});

beforeEach(async () => {
    await db.orders.clear();
});

describe("nextOrderNo", () => {
    it("starts at 1 and counts up within a shift", async () => {
        expect(await nextOrderNo("shift-1")).toBe(1);
        await saveOrderLocal(order("shift-1", { order_no: 1 }));
        expect(await nextOrderNo("shift-1")).toBe(2);
        await saveOrderLocal(order("shift-1", { order_no: 2 }));
        expect(await nextOrderNo("shift-1")).toBe(3);
    });

    it("starts again from 1 on a new shift", async () => {
        await saveOrderLocal(order("shift-1", { order_no: 9 }));
        expect(await nextOrderNo("shift-2")).toBe(1);
    });

    it("carries on from orders that arrived from another device, so numbers stay in step", async () => {
        await saveOrderLocal(order("shift-1", { order_no: 14 }));
        expect(await nextOrderNo("shift-1")).toBe(15);
    });

    it("copes with older orders that have no number", async () => {
        await saveOrderLocal(order("shift-1"));
        await saveOrderLocal(order("shift-1"));
        expect(await nextOrderNo("shift-1")).toBe(3);
    });

    it("does not fail without a shift", async () => {
        expect(await nextOrderNo(null)).toBe(1);
    });
});
