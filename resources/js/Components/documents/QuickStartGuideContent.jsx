const INK = "#241C15";
const GREEN = "#123D26";
const RED = "#D8392A";
const BLUE = "#2B6CA3";
const MUTED = "#5C5346";
const LINE = "#E8DFCB";
const CREAM = "#FFFCF5";

const page = {
    pageBreakAfter: "always",
    padding: "16mm 14mm",
    fontFamily: 'Georgia, "Times New Roman", serif',
    color: INK,
    fontSize: "11pt",
    lineHeight: 1.55,
    backgroundColor: "#fff",
};

const header = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: `2pt solid ${GREEN}`,
    paddingBottom: "8pt",
    marginBottom: "18pt",
};

const brand = {
    fontSize: "13pt",
    fontWeight: 700,
    color: GREEN,
    letterSpacing: "0.5pt",
};
const pageLabel = { fontSize: "8pt", color: MUTED, letterSpacing: "1pt" };
const h1 = {
    fontSize: "20pt",
    fontWeight: 700,
    color: GREEN,
    margin: "0 0 4pt",
};
const h1sub = { fontSize: "10pt", color: MUTED, margin: "0 0 18pt" };
const h2 = {
    fontSize: "13pt",
    fontWeight: 700,
    color: RED,
    margin: "16pt 0 6pt",
};
const p = { margin: "0 0 8pt" };
const divider = { borderBottom: `0.5pt solid ${LINE}`, margin: "14pt 0" };

const stepRow = { display: "flex", gap: "10pt", marginBottom: "9pt" };
const stepNum = {
    flexShrink: 0,
    width: "18pt",
    height: "18pt",
    borderRadius: "9pt",
    backgroundColor: GREEN,
    color: CREAM,
    fontSize: "9pt",
    fontWeight: 700,
    textAlign: "center",
    lineHeight: "18pt",
};
const stepTitle = { fontWeight: 700, marginBottom: "2pt" };

const roleTitle = { fontWeight: 700, color: GREEN, marginBottom: "2pt" };

const tableWrap = { border: `0.5pt solid ${LINE}`, margin: "6pt 0 4pt" };
const tableRow = {
    display: "flex",
    justifyContent: "space-between",
    padding: "5pt 8pt",
    borderBottom: `0.5pt solid ${LINE}`,
    fontFamily: "Courier, monospace",
    fontSize: "10pt",
};
const tableValue = { fontWeight: 700, color: BLUE };

function Footer({ label }) {
    return (
        <div
            style={{
                fontSize: "8pt",
                color: MUTED,
                borderTop: `0.5pt solid ${LINE}`,
                paddingTop: "6pt",
                marginTop: "20pt",
            }}
        >
            {label}
        </div>
    );
}

const steps = [
    [
        "1",
        "Create your account",
        "Sign up with your email. This gives you an Owner account — think of it as your master key, not your everyday login.",
    ],
    [
        "2",
        "Add your shop",
        "Name your business and choose its type: Shop, Bar, or Resto-Bar. Bar and Resto-Bar are where you also set your shop's standard shot size.",
    ],
    [
        "3",
        "Create a shop manager account",
        "This is the account that will actually run the floor day to day. Give it to whoever manages the business on the ground — that might still be you.",
    ],
    [
        "4",
        "Log out, then log back in as shop manager",
        "Your Owner account goes back in the drawer. From here on, you work from the shop manager account.",
    ],
    [
        "5",
        "Pair this device",
        "The first login on any device needs the full password. After that, unlock with a 4-digit PIN — fast enough for a queue at the bar.",
    ],
];

const roles = [
    [
        "Owner",
        "Full control of the business, including billing and shop setup. Used for setup, not for ringing up sales.",
    ],
    [
        "Shop Manager",
        "Runs a shop day to day. Creates staff and manager accounts, manages products and stock, and can open cash-up and reports.",
    ],
    [
        "Manager",
        "Handles products, stock, and the sales floor for daily operations, without shop-wide settings access.",
    ],
    [
        "Staff",
        "Rings up sales, opens tables, and takes payment. Nothing more, nothing less.",
    ],
];

const stockTable = [
    ["Empty bottle weight", "500g"],
    ["Full bottle weight", "1250g"],
    ["Capacity", "750ml"],
    ["Shop shot size", "25ml"],
    ["Shots per full bottle", "30"],
];

export default function QuickStartGuideContent() {
    return (
        <div>
            <style>{"@page { size: A4; margin: 0; }"}</style>

            {/* Page 1 */}
            <div style={page}>
                <div style={header}>
                    <span style={brand}>MOM &amp; POP POS</span>
                    <span style={pageLabel}>QUICK START GUIDE</span>
                </div>

                <h1 style={h1}>From sign-up to your first sale</h1>
                <p style={h1sub}>
                    Five steps. Do this once, and every till after this is a
                    4-digit PIN away.
                </p>

                {steps.map(([n, t, d]) => (
                    <div style={stepRow} key={n}>
                        <span style={stepNum}>{n}</span>
                        <div>
                            <p style={stepTitle}>{t}</p>
                            <p style={{ margin: 0 }}>{d}</p>
                        </div>
                    </div>
                ))}

                <div style={divider} />

                <h2 style={h2}>Who can do what</h2>
                {roles.map(([title, desc]) => (
                    <div key={title} style={{ marginBottom: "10pt" }}>
                        <p style={roleTitle}>{title}</p>
                        <p style={{ margin: 0 }}>{desc}</p>
                    </div>
                ))}

                <Footer label="Mom & Pop POS — Quick Start Guide — Page 1 of 3" />
            </div>

            {/* Page 2 */}
            <div style={page}>
                <div style={header}>
                    <span style={brand}>MOM &amp; POP POS</span>
                    <span style={pageLabel}>QUICK START GUIDE</span>
                </div>

                <h1 style={h1}>Shop type, stock, and units</h1>
                <p style={h1sub}>Set up once for how you actually sell.</p>

                <h2 style={h2}>Choosing a shop type</h2>
                <p style={p}>
                    When you create your shop, you choose Shop, Bar, or
                    Resto-Bar. A Shop keeps everything in plain units, with no
                    bottle or alcohol setup at all. Bar and Resto-Bar unlock
                    bottle stock — and that's also where you set your shop's
                    standard shot size, which every bottle in that shop then
                    uses automatically.
                </p>

                <h2 style={h2}>Bottles are weighed, not guessed</h2>
                <p style={p}>
                    For Bar and Resto-Bar shops: when you create a bottle
                    product, enter its empty weight, its full weight, and its
                    capacity. Combined with your shop's shot size, Mom & Pop POS
                    works out exactly how many shots are left in a bottle —
                    accurate even mid-pour — simply from what it weighs.
                </p>

                <div style={tableWrap}>
                    {stockTable.map(([label, value], i) => (
                        <div
                            key={label}
                            style={{
                                ...tableRow,
                                borderBottom:
                                    i === stockTable.length - 1
                                        ? "none"
                                        : tableRow.borderBottom,
                            }}
                        >
                            <span style={{ color: MUTED }}>{label}</span>
                            <span style={tableValue}>{value}</span>
                        </div>
                    ))}
                </div>

                <h2 style={h2}>Single items</h2>
                <p style={p}>
                    For things you sell one at a time — a soda, a plate of food
                    — stock is entered and tracked exactly as one unit each.
                    Applies to every shop type.
                </p>

                <h2 style={h2}>Packs (six-packs and similar)</h2>
                <p style={p}>
                    Some products come packaged — a six-pack of beer, for
                    example. When that pack is sold, Mom & Pop POS opens it
                    automatically and tracks the individual units inside from
                    that point on.
                </p>

                <h2 style={h2}>Cases</h2>
                <p style={p}>
                    If you buy in bulk — say a case of 24 — you set that up once
                    when you create the product, so future stock counts match
                    how you actually buy.
                </p>

                <h2 style={h2}>Two different stock screens</h2>
                <p style={p}>
                    The Add Stock page is for quick top-ups during the day — add
                    "1" six-pack and the system logs the 6 units it contains.
                    Creating or editing a product is where you define how that
                    product is packaged in the first place. Both are only
                    available to Manager and Shop Manager accounts.
                </p>

                <Footer label="Mom & Pop POS — Quick Start Guide — Page 2 of 3" />
            </div>

            {/* Page 3 */}
            <div style={{ ...page, pageBreakAfter: "auto" }}>
                <div style={header}>
                    <span style={brand}>MOM &amp; POP POS</span>
                    <span style={pageLabel}>QUICK START GUIDE</span>
                </div>

                <h1 style={h1}>The sales floor and cash-up</h1>
                <p style={h1sub}>
                    What happens between opening the till and closing it out.
                </p>

                <h2 style={h2}>Fast sales and tables</h2>
                <p style={p}>
                    Use fast sale for a quick counter transaction. Use a table
                    for guests who are staying a while. Managers can move a
                    table between staff, void it, or defer it. Deferred tables
                    are for walk-outs, and can be printed to PDF at cash-up so
                    nothing is unaccounted for.
                </p>

                <h2 style={h2}>Before cash-up: sync</h2>
                <p style={p}>
                    Every device that made a sale needs to press Sync in the POS
                    before cash-up can happen. This pushes that device's sales
                    into the system so they can be reconciled.
                </p>

                <h2 style={h2}>Reading the cash-up report</h2>
                <p style={p}>
                    Cash-up gives an itemised total for each payment method,
                    individual staff payouts you can print to PDF, and the day's
                    logged expenses. Wasted stock and voided or deferred tables
                    also appear on the report — nothing is silently deleted,
                    it's recorded and visible.
                </p>

                <h2 style={h2}>Cash-up history</h2>
                <p style={p}>
                    Every past cash-up is saved and can be reopened or reprinted
                    at any time — useful for reconciling a dispute weeks later.
                </p>

                <div style={divider} />
                <p style={{ fontSize: "9pt", color: MUTED, margin: 0 }}>
                    Questions? Reach us on WhatsApp or by phone at +263 77 327
                    0659, or by email.
                </p>

                <Footer label="Mom & Pop POS — Quick Start Guide — Page 3 of 3" />
            </div>
        </div>
    );
}
