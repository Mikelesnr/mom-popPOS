import RecieptLogo from "../RecieptLogo";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export const BillTemplate = ({
    shopName,
    title,
    date,
    staff,
    customer, // Optional prop
    items,
    totals,
}) => (
    <div className="receipt-print p-8 max-w-sm mx-auto bg-white text-black font-mono text-sm border border-black">
        <h1 className="text-center font-bold text-xl uppercase mb-2">
            {shopName}
        </h1>
        <h2 className="text-center font-bold text-lg mb-4">{title}</h2>

        <div className="space-y-1 mb-4">
            <p>Date: {date}</p>
            <p>Staff: {staff}</p>
            {/* Only renders if customer/table name is provided */}
            {customer && <p className="font-bold">Customer: {customer}</p>}
        </div>

        <hr className="my-2 border-black" />

        <div className="space-y-1">
            {items.map((item, i) => (
                <div key={i} className="flex justify-between">
                    <span>
                        {item.quantity}x {item.name}
                    </span>
                    <span>{money(item.subtotal)}</span>
                </div>
            ))}
        </div>

        <hr className="my-2 border-black" />

        <div className="font-bold space-y-1">
            {Object.entries(totals).map(([method, total]) => (
                <div key={method} className="flex justify-between">
                    <span>{method.toUpperCase()}</span>
                    <span>{money(total)}</span>
                </div>
            ))}
        </div>

        {/* Footer: Dynamic Logo */}
        <div className="mt-8 flex justify-center">
            <RecieptLogo className="h-12 w-12 text-black" />
        </div>
    </div>
);
