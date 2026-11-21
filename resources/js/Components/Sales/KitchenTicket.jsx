// Kitchen and bar ticket: big, no prices, easy to read from a distance.
// Shows who rang it up and which table or order it is for. The same layout is
// used for both stations; `station` is the name printed at the top.

export const KitchenTicket = ({
    shopName,
    tableName,
    orderNo,
    staff,
    time,
    items = [],
    isUpdate = false,
    station = "KITCHEN",
}) => {
    // A table prints its name. A fast sale prints its order number.
    const label = tableName ? "TABLE" : "ORDER";
    const reference = tableName || (orderNo ? `#${orderNo}` : "Walk-in");

    return (
        <div className="receipt-print p-6 max-w-sm mx-auto bg-white text-black font-mono">
            <p className="text-center text-xs uppercase tracking-widest">
                {shopName}
            </p>
            <p className="text-center text-sm font-black tracking-widest mt-1">
                {station}
            </p>
            <p className="text-center text-xs font-bold mt-2">{label}</p>
            <h2 className="text-center text-4xl font-black uppercase leading-tight">
                {reference}
            </h2>
            <p className="text-center text-sm font-bold mt-1">
                {isUpdate ? "ADD TO TABLE" : "NEW ORDER"}
            </p>
            <p className="text-xs mt-2">
                {time}
                {staff ? ` · ${staff}` : ""}
            </p>

            <hr className="my-3 border-black" />

            <div className="space-y-1">
                {items.map((item, i) => {
                    const type = item.metadata?.type;
                    return (
                        <div key={i} className="flex gap-3 text-xl font-bold">
                            <span className="shrink-0">{item.quantity}x</span>
                            <span>
                                {item.name}
                                {type && type !== "unit" ? ` (${type})` : ""}
                            </span>
                        </div>
                    );
                })}
            </div>

            <hr className="my-3 border-black" />
        </div>
    );
};
