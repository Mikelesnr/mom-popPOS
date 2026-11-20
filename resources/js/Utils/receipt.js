/**
 * Totals block for a receipt printed after payment. The bill template prints
 * each entry as "KEY  $value", so cash shows what was handed over and the
 * change, and any other method shows how it was paid.
 */
export const paymentTotals = (total, payment) => {
    const totals = { total };
    if (!payment) return totals;

    if (payment.method === "cash") {
        totals.cash = payment.amount_tendered ?? total;
        totals.change = payment.change_due ?? 0;
    } else if (payment.method) {
        totals[payment.method] = total;
    }
    return totals;
};
