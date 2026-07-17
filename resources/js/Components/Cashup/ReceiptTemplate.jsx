import RecieptLogo from "../RecieptLogo";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export const ReceiptTemplate = ({
    shopName,
    title,
    date,
    staff,
    items,
    totals,
    deferredTables = [],
}) => (
    <div className="receipt-print p-8 max-w-sm mx-auto bg-white text-black font-mono text-sm border border-black">
        <h1 className="text-center font-bold text-xl uppercase mb-2">
            {shopName}
        </h1>
        <h2 className="text-center font-bold text-lg mb-4">{title}</h2>

        <p>Date: {date}</p>
        <p>Staff: {staff}</p>
        <hr className="my-2 border-black" />

        {items.map((item, i) => (
            <div key={i} className="flex justify-between">
                <span>
                    {item.quantity}x {item.name}
                </span>
                <span>{money(item.subtotal)}</span>
            </div>
        ))}

        <hr className="my-2 border-black" />

        <div className="font-bold">
            {Object.entries(totals).map(([method, total]) => (
                <div key={method} className="flex justify-between">
                    <span>{method.toUpperCase()}</span>
                    <span>{money(total)}</span>
                </div>
            ))}
        </div>

        {deferredTables.length > 0 && (
            <>
                <hr className="my-2 border-black" />
                <p className="font-bold uppercase">Deferred Tables</p>
                {deferredTables.map((table) => (
                    <div key={table.id} className="flex justify-between">
                        <span>{table.name}</span>
                        <span>{money(table.total_amount)}</span>
                    </div>
                ))}
            </>
        )}

        {/* Footer: Dynamic Logo */}
        <div className="mt-8 flex justify-center">
            <RecieptLogo className="h-12 w-12 text-black" />
        </div>
    </div>
);
