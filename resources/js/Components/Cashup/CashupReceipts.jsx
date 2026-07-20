import React from "react";
import { ReceiptTemplate } from "../Shared/ReceiptTemplate";
import { formatShiftDate, qty } from "./helpers";

// react-to-print clones this node into its own hidden iframe and prints
// only that — it doesn't matter what layout/nav wraps this page. Kept
// off-screen (not display:none, which some browsers refuse to print)
// rather than toggled with CSS print classes.
export function CashupReceipts({
    data,
    printTarget,
    printRef,
    groupedShopItems,
    staffItemsByUser,
}) {
    if (!data) return <div className="fixed -left-[9999px] top-0" />;

    return (
        <div className="fixed -left-[9999px] top-0">
            <div ref={printRef}>
                {/* SHOP SLIP */}
                {printTarget?.type === "shop" && (
                    <ReceiptTemplate
                        shopName={data.shop_name}
                        title={`${data.shop_name} Cashup`}
                        date={formatShiftDate(data.shift.created_at)}
                        staff="All Staff"
                        items={groupedShopItems}
                        totals={data.summary.totals_by_method}
                    />
                )}

                {/* STAFF SLIP */}
                {printTarget?.type === "staff" &&
                    data.summary.totals_by_staff[printTarget.id] && (
                        <ReceiptTemplate
                            shopName={data.shop_name}
                            title={`${
                                data.summary.totals_by_staff[printTarget.id]
                                    .staff_name
                            } Cashup`}
                            date={formatShiftDate(data.shift.created_at)}
                            staff={
                                data.summary.totals_by_staff[printTarget.id]
                                    .staff_name
                            }
                            items={staffItemsByUser[printTarget.id] || []}
                            totals={
                                data.summary.totals_by_staff[printTarget.id]
                                    .methods
                            }
                            deferredTables={Object.values(
                                data.summary.deferred_tables,
                            ).filter(
                                (t) =>
                                    t.staff_name ===
                                    data.summary.totals_by_staff[printTarget.id]
                                        .staff_name,
                            )}
                        />
                    )}

                {/* WASTE LOG SLIP */}
                {printTarget?.type === "waste" && (
                    <ReceiptTemplate
                        shopName={data.shop_name}
                        title="Waste & Breakage Log"
                        date={formatShiftDate(data.shift.created_at)}
                        staff="System"
                        items={data.shift.waste_logs.map((log) => ({
                            quantity: qty(log.quantity),
                            name: `${log.product?.name || "Unknown Item"} (${log.reason})`,
                            subtotal: 0,
                        }))}
                        totals={{}}
                    />
                )}

                {/* TABLE BILL */}
                {printTarget?.type === "table" &&
                    Object.values(data.summary.deferred_tables)
                        .filter((t) => t.id === printTarget.id)
                        .map((table) => (
                            <ReceiptTemplate
                                key={table.id}
                                shopName={data.shop_name}
                                title={`Bill for ${table.name}`}
                                date={formatShiftDate(data.shift.created_at)}
                                staff={table.staff_name}
                                items={table.items}
                                totals={{ total: table.total_amount }}
                            />
                        ))}
            </div>
        </div>
    );
}
