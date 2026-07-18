export default function Cashup({ shiftId: propShiftId }) {
    const { state, actions, computed } = useCashupData(propShiftId);

    return (
        <div className="min-h-screen bg-stone-50">
            <CashupHeader
                shopName={state.data?.shop_name}
                createdAt={state.data?.shift?.created_at}
                isOpen={computed.isOpen}
            />

            {/* Pass state and actions as props to your sub-components */}
            <ShopTotalsSection
                totals={state.data?.summary.totals_by_method}
                shopTotal={computed.shopTotal}
                onPrint={() => actions.setPrintTarget({ type: "shop" })}
            />

            {/* ... other components ... */}
        </div>
    );
}
