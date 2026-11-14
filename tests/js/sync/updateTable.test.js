// Regression test for the real Utils/db.js helper (not a copy of it).
import "fake-indexeddb/auto";
import {
    db,
    saveTableLocal,
    saveOrderItemLocal,
    updateTableItemsLocal,
} from "../../../resources/js/Utils/db";

describe("updateTableItemsLocal", () => {
    it("keeps earlier rounds and totals everything on the table", async () => {
        const tableId = crypto.randomUUID();
        await saveTableLocal({
            id: tableId, shop_id: "s", shift_id: "sh", user_id: "u",
            name: "T5", total_amount: 10, status: "open",
        });
        await saveOrderItemLocal({
            id: crypto.randomUUID(), orderable_id: tableId, product_id: "p",
            name: "Castle x2", quantity: 2, unit_price: 5, subtotal: 10,
        });

        const total = await updateTableItemsLocal(tableId, [
            { product_id: "p2", name: "Gin", quantity: 1, unit_price: 3, subtotal: 3 },
        ]);

        const items = await db.order_items.where("orderable_id").equals(tableId).toArray();
        expect(items.map((i) => i.name).sort()).toEqual(["Castle x2", "Gin"]);
        expect(total).toBe(13);
        expect((await db.open_tables.get(tableId)).total_amount).toBe(13);
    });

    it("a second round stacks on the first two", async () => {
        const tableId = crypto.randomUUID();
        await saveTableLocal({ id: tableId, shop_id: "s", shift_id: "sh", user_id: "u", name: "T6", total_amount: 0, status: "open" });
        await updateTableItemsLocal(tableId, [{ product_id: "a", name: "A", quantity: 1, unit_price: 1.1, subtotal: 1.1 }]);
        await updateTableItemsLocal(tableId, [{ product_id: "b", name: "B", quantity: 1, unit_price: 2.2, subtotal: 2.2 }]);
        expect((await db.open_tables.get(tableId)).total_amount).toBe(3.3);
    });
});
