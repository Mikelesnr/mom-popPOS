// Kitchen / prep ticket: big, no prices, easy to read from a distance.

export const KitchenTicket = ({
    shopName,
    tableName,
    staff,
    time,
    items = [],
    isUpdate = false,
}) => (
    <div className="receipt-print p-6 max-w-sm mx-auto bg-white text-black font-mono">
        <p className="text-center text-xs uppercase tracking-widest">
            {shopName}
        </p>
        <h2 className="text-center text-3xl font-black uppercase my-2">
            {tableName || "Walk-in"}
        </h2>
        <p className="text-center text-sm font-bold">
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
