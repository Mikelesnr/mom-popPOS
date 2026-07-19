import { useRef, useState } from "react";
import { Head, Link } from "@inertiajs/react";
import { useReactToPrint } from "react-to-print";
import ApplicationLogo from "@/Components/ApplicationLogo";
import QuickStartGuideContent from "@/Components/documents/QuickStartGuideContent";
import StaffCheatSheetContent from "@/Components/documents/StaffCheatSheetContent";

/* ---------- small inline icons (single stroke, no library dependency) ---------- */

const Icon = {
    Bottle: (p) => (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            {...p}
        >
            <path d="M10 2h4v3.2c0 .6.2 1 .6 1.4L16 8v11.5A2.5 2.5 0 0 1 13.5 22h-3A2.5 2.5 0 0 1 8 19.5V8l1.4-1.4c.4-.4.6-.8.6-1.4V2Z" />
            <path d="M8.5 12h7" />
        </svg>
    ),
    Scale: (p) => (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            {...p}
        >
            <path d="M12 3v18M7 7l-4 8a4 4 0 0 0 8 0l-4-8ZM17 7l-4 8a4 4 0 0 0 8 0l-4-8Z" />
            <path d="M5 7h14M9 21h6" />
        </svg>
    ),
    Table: (p) => (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            {...p}
        >
            <path d="M3 8h18M5 8v11M19 8v11M3 8l2-4h14l2 4" />
        </svg>
    ),
    Sync: (p) => (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            {...p}
        >
            <path d="M4 12a8 8 0 0 1 13.7-5.7L20 8M20 4v4h-4" />
            <path d="M20 12a8 8 0 0 1-13.7 5.7L4 16M4 20v-4h4" />
        </svg>
    ),
    Receipt: (p) => (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            {...p}
        >
            <path d="M6 2h12v19l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V2Z" />
            <path d="M9 7h6M9 11h6M9 15h4" />
        </svg>
    ),
    Users: (p) => (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            {...p}
        >
            <circle cx="9" cy="8" r="3.2" />
            <path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
            <circle cx="17" cy="8.5" r="2.4" />
            <path d="M16 14.7c2.6.4 4.3 2.1 4.9 5.3" />
        </svg>
    ),
    Wifi: (p) => (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            {...p}
        >
            <path d="M2 8.5a15.5 15.5 0 0 1 20 0" />
            <path d="M5.5 12.5a10.5 10.5 0 0 1 13 0" />
            <path d="M9 16.3a5.6 5.6 0 0 1 6 0" />
            <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
        </svg>
    ),
    Pin: (p) => (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            {...p}
        >
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <circle cx="8.5" cy="8" r="1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
            <circle cx="15.5" cy="8" r="1" fill="currentColor" stroke="none" />
            <path d="M8 13h8M8 16.5h5" />
        </svg>
    ),
    Trash: (p) => (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            {...p}
        >
            <path d="M4 7h16M9 7V4.5h6V7M6 7l1 13.5A1.5 1.5 0 0 0 8.5 22h7a1.5 1.5 0 0 0 1.5-1.5L18 7" />
            <path d="M10 11v6M14 11v6" />
        </svg>
    ),
    Box: (p) => (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            {...p}
        >
            <path d="M3 8l9-5 9 5-9 5-9-5Z" />
            <path d="M3 8v8l9 5 9-5V8M12 13v8" />
        </svg>
    ),
    Chevron: (p) => (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            {...p}
        >
            <path d="M7 10l5 5 5-5" />
        </svg>
    ),
    Whatsapp: (p) => (
        <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.87.5 3.63 1.44 5.15L2 22l5.1-1.53a9.86 9.86 0 0 0 4.93 1.34h.01c5.46 0 9.91-4.45 9.91-9.9C21.95 6.45 17.5 2 12.04 2Zm5.86 14.06c-.25.7-1.44 1.34-1.99 1.42-.5.08-1.15.11-1.86-.12-.43-.14-.98-.32-1.68-.63-2.96-1.28-4.9-4.26-5.04-4.46-.15-.2-1.2-1.6-1.2-3.06 0-1.45.76-2.16 1.03-2.46.27-.29.58-.36.77-.36.2 0 .39 0 .56.01.18.01.42-.07.65.5.25.6.85 2.07.92 2.22.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.44.52-.15.15-.3.31-.13.6.17.3.76 1.26 1.64 2.04 1.13 1 2.08 1.32 2.38 1.47.3.15.47.13.65-.08.17-.2.74-.86.94-1.16.2-.3.4-.24.66-.15.27.1 1.72.81 2.02.96.3.15.5.22.57.34.08.13.08.72-.17 1.43Z" />
        </svg>
    ),
};

/* A loose hand-painted brush stroke, echoing the mark under "POS" in the logo. */
function BrushUnderline({ className = "", color = "#D8392A" }) {
    return (
        <svg
            viewBox="0 0 220 20"
            className={className}
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            <path
                d="M3 12c22-8 55-9 84-6 33 3.5 68 4 130-2-30 11-70 13-110 11-30-1.5-60-4-107 3Z"
                fill={color}
            />
        </svg>
    );
}

/* ---------- reusable pieces ---------- */

function SectionEyebrow({ children, tone = "ink" }) {
    const toneClass = tone === "cream" ? "text-[#CFE3D3]" : "text-[#1C7A46]";
    return (
        <p
            className={`font-mono text-[11px] tracking-[0.25em] uppercase ${toneClass} mb-3`}
        >
            {children}
        </p>
    );
}

function FeatureCard({ icon: IconEl, title, children }) {
    return (
        <div className="rounded-md border border-[#E8DFCB] bg-white p-6 hover:border-[#D8392A]/50 hover:shadow-sm transition-all">
            <IconEl className="w-7 h-7 text-[#D8392A] mb-4" />
            <h3 className="font-serif text-lg text-[#241C15] mb-2">{title}</h3>
            <p className="text-sm text-[#5C5346] leading-relaxed">{children}</p>
        </div>
    );
}

function AccordionItem({ q, a, isOpen, onClick }) {
    return (
        <div className="border-b border-[#E8DFCB]">
            <button
                onClick={onClick}
                className="w-full flex items-center justify-between gap-4 py-5 text-left group"
                aria-expanded={isOpen}
            >
                <span className="font-serif text-base sm:text-lg text-[#241C15] group-hover:text-[#D8392A] transition-colors">
                    {q}
                </span>
                <Icon.Chevron
                    className={`w-5 h-5 shrink-0 text-[#1C7A46] transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                    }`}
                />
            </button>
            <div
                className={`grid transition-all duration-200 ease-out ${
                    isOpen
                        ? "grid-rows-[1fr] opacity-100 pb-5"
                        : "grid-rows-[0fr] opacity-0"
                }`}
                style={{ display: "grid" }}
            >
                <div className="overflow-hidden">
                    <p className="text-sm text-[#5C5346] leading-relaxed max-w-2xl">
                        {a}
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ---------- documentation content, split by shop type ---------- */

const docsCommon = [
    {
        q: "How do I get started?",
        a: "Sign up and you'll get an Owner account. Use it once to create your shop and a shop manager account, then log in as the shop manager for everyday use. Your Owner login stays in reserve for account-level changes.",
    },
    {
        q: "What can each type of account do?",
        a: 'Owner sets up the business and handles account-level settings. Shop Manager runs a shop day to day and can create staff. Manager handles products, stock and the sales floor. Staff rings up sales and takes payment. "Manager" throughout this page includes Shop Manager.',
    },
];

const docsShopType = {
    shop: [
        {
            q: "What do I choose when creating my shop?",
            a: "Select 'Shop' when creating your business. This keeps things simple: every product is tracked in plain units — no bottles, no shots, no alcohol-specific setup at all.",
        },
        {
            q: "How does stock work for a normal shop?",
            a: "Single items are tracked one at a time. Multipacks — a six-pack of drinks, say — open automatically into individual units the moment they're sold. Anything you buy in bulk, like a case of 24, is set up that way from the start so your counts match how you actually buy.",
        },
    ],
    bar: [
        {
            q: "What's a shot size, and when do I set it?",
            a: "Choose 'Bar' or 'Resto-Bar' when you create your shop, and you'll set your shop's standard shot size right there — for example 25ml. Every bottle product in that shop uses this automatically, so you only set it once.",
        },
        {
            q: "How does the bottle counter actually work?",
            a: "By weight, not estimation. When you create a bottle product, you enter its empty weight, its full weight, and its capacity. From then on, Mom & Pop POS can work out exactly how many shots are left in that bottle — even mid-pour — just from what it weighs.",
        },
        {
            q: "What about six-packs, cases, and non-alcoholic stock?",
            a: "Bars and resto-bars still get everything a normal shop does. Single items track one at a time, multipacks open automatically when sold, and bulk buys like a case of 24 are set up once when you create the product.",
        },
    ],
};

const docsTail = [
    {
        q: "Fast sale or table — which do I use?",
        a: "Fast Sale is for a quick transaction at the counter. A Table stays open for guests who are sticking around, and can be moved between staff, voided, or deferred by a manager.",
    },
    {
        q: "What happens with a walk-out?",
        a: "A manager defers the table instead of leaving it open indefinitely. Deferred tables are kept on record, show up at cash-up, and can be printed to PDF.",
    },
    {
        q: "Why does every device need to sync before cash-up?",
        a: "Cash-up totals what's been synced. If a device hasn't pressed Sync in the POS, its sales won't be counted — so every device syncs first, every time.",
    },
    {
        q: "What does a cash-up report actually show me?",
        a: "An itemised total per payment method, individual staff payouts you can print to PDF, the day's expenses, and any wasted stock or voided/deferred tables. Nothing is silently removed — it's all part of the record.",
    },
    {
        q: "Can I look back at old cash-ups?",
        a: "Yes. Every cash-up is saved to your shop's history and can be reopened or reprinted whenever you need it.",
    },
];

export default function Welcome({ auth }) {
    const [openDoc, setOpenDoc] = useState(0);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [shopType, setShopType] = useState("bar"); // 'shop' | 'bar'

    const quickStartRef = useRef(null);
    const staffSheetRef = useRef(null);

    const printQuickStart = useReactToPrint({
        contentRef: quickStartRef,
        documentTitle: "mom-and-pop-pos-quick-start-guide",
    });

    const printStaffSheet = useReactToPrint({
        contentRef: staffSheetRef,
        documentTitle: "mom-and-pop-pos-staff-cheat-sheet",
    });

    const navLinks = [
        ["How it works", "#how-it-works"],
        ["Features", "#features"],
        ["For bars & restaurants", "#for-bars"],
        ["Docs", "#docs"],
        ["Contact", "#contact"],
    ];

    const activeDocs = [...docsCommon, ...docsShopType[shopType], ...docsTail];

    return (
        <>
            <Head title="Mom & Pop POS — Point of sale built for how you actually run your shop">
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
                    rel="stylesheet"
                />
            </Head>

            <style>{`
                :root {
                    --cream: #FFFCF5;
                    --ink: #241C15;
                    --red: #D8392A;
                    --green: #1C7A46;
                    --green-deep: #123D26;
                    --blue: #2B6CA3;
                    --gold: #E4A23A;
                    --line: #E8DFCB;
                }
                .font-serif { font-family: 'Fraunces', Georgia, serif; }
                .font-sans { font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif; }
                .font-mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
                @keyframes riseIn {
                    from { opacity: 0; transform: translateY(14px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .rise-in { animation: riseIn 0.7s cubic-bezier(.2,.7,.2,1) both; }
                @media (prefers-reduced-motion: reduce) {
                    .rise-in { animation: none; }
                }
            `}</style>

            <div className="font-sans bg-[#FFFCF5] text-[#241C15] antialiased">
                {/* ---------------- NAV ---------------- */}
                <header className="sticky top-0 z-50 border-b border-[#E8DFCB] bg-[#FFFCF5]/95 backdrop-blur">
                    <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ApplicationLogo className="h-10 w-auto" />
                        </div>

                        <nav className="hidden md:flex items-center gap-8">
                            {navLinks.map(([label, href]) => (
                                <a
                                    key={href}
                                    href={href}
                                    className="text-sm text-[#5C5346] hover:text-[#D8392A] transition-colors"
                                >
                                    {label}
                                </a>
                            ))}
                        </nav>

                        <div className="hidden md:flex items-center gap-3">
                            {auth?.user ? (
                                <Link
                                    href={route("dashboard")}
                                    className="text-sm px-4 py-2 rounded-md bg-[#D8392A] text-white font-medium hover:bg-[#c02f21] transition-colors"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route("login")}
                                        className="text-sm text-[#5C5346] hover:text-[#241C15] transition-colors"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={route("register")}
                                        className="text-sm px-4 py-2 rounded-md bg-[#D8392A] text-white font-medium hover:bg-[#c02f21] transition-colors"
                                    >
                                        Create your account
                                    </Link>
                                </>
                            )}
                        </div>

                        <button
                            className="md:hidden text-[#241C15]"
                            onClick={() => setMobileOpen((v) => !v)}
                            aria-label="Toggle menu"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="w-6 h-6"
                            >
                                {mobileOpen ? (
                                    <path d="M6 6l12 12M18 6L6 18" />
                                ) : (
                                    <path d="M4 7h16M4 12h16M4 17h16" />
                                )}
                            </svg>
                        </button>
                    </div>

                    {mobileOpen && (
                        <div className="md:hidden border-t border-[#E8DFCB] px-5 py-4 space-y-4">
                            {navLinks.map(([label, href]) => (
                                <a
                                    key={href}
                                    href={href}
                                    onClick={() => setMobileOpen(false)}
                                    className="block text-sm text-[#5C5346]"
                                >
                                    {label}
                                </a>
                            ))}
                            <div className="flex gap-3 pt-2">
                                {auth?.user ? (
                                    <Link
                                        href={route("dashboard")}
                                        className="text-sm px-4 py-2 rounded-md bg-[#D8392A] text-white font-medium"
                                    >
                                        Dashboard
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href={route("login")}
                                            className="text-sm text-[#5C5346]"
                                        >
                                            Log in
                                        </Link>
                                        <Link
                                            href={route("register")}
                                            className="text-sm px-4 py-2 rounded-md bg-[#D8392A] text-white font-medium"
                                        >
                                            Create your account
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </header>

                {/* ---------------- HERO ---------------- */}
                <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28 grid lg:grid-cols-2 gap-14 items-center">
                    <div className="rise-in">
                        <p className="font-mono text-xs tracking-[0.25em] uppercase text-[#1C7A46] mb-5">
                            Point of sale, built for the till
                        </p>
                        <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.08] mb-3 text-[#241C15]">
                            Sales don't stop
                            <br />
                            when the signal does.
                        </h1>
                        <BrushUnderline
                            className="w-40 h-4 mb-6"
                            color="#E4A23A"
                        />
                        <p className="text-lg text-[#5C5346] leading-relaxed mb-9 max-w-lg">
                            Mom & Pop POS keeps your shop, bar or restaurant
                            running — ring up sales, track stock accurately, and
                            reconcile cash-up at the end of the day, even when
                            the network drops.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Link
                                href={route("register")}
                                className="px-6 py-3 rounded-md bg-[#D8392A] text-white font-medium hover:bg-[#c02f21] transition-colors"
                            >
                                Create your account
                            </Link>
                            <a
                                href="#how-it-works"
                                className="px-6 py-3 rounded-md border border-[#E8DFCB] text-[#241C15] hover:border-[#D8392A] transition-colors"
                            >
                                See how it works
                            </a>
                        </div>
                        <p className="mt-6 text-xs text-[#8A8070] font-mono">
                            Currently built for businesses in Zimbabwe.
                        </p>
                    </div>

                    {/* signature receipt visual */}
                    <div
                        className="rise-in flex justify-center lg:justify-end"
                        style={{ animationDelay: "0.15s" }}
                    >
                        <div className="w-[300px] sm:w-[340px] bg-white border border-[#E8DFCB] rounded-md shadow-xl shadow-black/5 -rotate-2 p-6 font-mono text-[12px] leading-relaxed">
                            <p className="text-center font-serif font-semibold text-base tracking-wide mb-1 text-[#D8392A]">
                                MOM & POP POS
                            </p>
                            <p className="text-center text-[10px] text-[#8A8070] mb-4">
                                COUNTER SALE · #0042
                            </p>
                            <div className="border-t border-dashed border-[#E8DFCB] my-2" />
                            <div className="flex justify-between text-[#241C15]">
                                <span>Castle Lite 340ml ×4</span>
                                <span>$6.00</span>
                            </div>
                            <div className="flex justify-between text-[#241C15]">
                                <span>Chicken Wings ×1</span>
                                <span>$5.50</span>
                            </div>
                            <div className="mt-2 mb-1 text-[#2B6CA3]">
                                Jack Daniels 750ml
                            </div>
                            <div className="flex justify-between text-[#2B6CA3] text-[11px]">
                                <span>
                                    &nbsp;&nbsp;→ weighed: 29 shots left
                                </span>
                            </div>
                            <div className="border-t border-dashed border-[#E8DFCB] my-3" />
                            <div className="flex items-center gap-2 text-[#1C7A46] text-[11px] mb-3">
                                <Icon.Sync className="w-3.5 h-3.5" />
                                <span>SYNCED FROM 3 DEVICES</span>
                            </div>
                            <div className="flex justify-between text-[#241C15]">
                                <span>Cash</span>
                                <span>$8.00</span>
                            </div>
                            <div className="flex justify-between text-[#241C15]">
                                <span>EcoCash</span>
                                <span>$3.50</span>
                            </div>
                            <div className="border-t border-[#241C15]/20 mt-3 pt-2 flex justify-between font-semibold text-sm text-[#241C15]">
                                <span>TOTAL</span>
                                <span>$11.50</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ---------------- HOW IT WORKS ---------------- */}
                <section
                    id="how-it-works"
                    className="bg-[#123D26] text-[#FFFCF5]"
                >
                    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
                        <SectionEyebrow tone="cream">
                            Getting set up
                        </SectionEyebrow>
                        <h2 className="font-serif text-3xl sm:text-4xl mb-14 max-w-xl">
                            Five steps, and every till after this is a PIN away.
                        </h2>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
                            {[
                                [
                                    "01",
                                    "Create your account",
                                    "Sign up with your email and get an Owner account — your master key, not your everyday login.",
                                ],
                                [
                                    "02",
                                    "Add your shop",
                                    "Name your business and choose its type — Shop, Bar, or Resto-Bar. Bar and Resto-Bar are where you set your shop's shot size.",
                                ],
                                [
                                    "03",
                                    "Create a shop manager",
                                    "Set up the account that will run the floor day to day.",
                                ],
                                [
                                    "04",
                                    "Switch accounts",
                                    "Log out of Owner, log in as shop manager. Owner stays safely in reserve.",
                                ],
                                [
                                    "05",
                                    "Pair the till",
                                    "First login needs a password. After that, unlock with a 4-digit PIN.",
                                ],
                            ].map(([n, t, d]) => (
                                <div key={n}>
                                    <p className="font-mono text-[#E4A23A] text-sm mb-3">
                                        {n}
                                    </p>
                                    <h3 className="font-serif text-lg mb-2">
                                        {t}
                                    </h3>
                                    <p className="text-sm text-[#CFE3D3] leading-relaxed">
                                        {d}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ---------------- ROLES ---------------- */}
                <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
                    <SectionEyebrow>Accounts</SectionEyebrow>
                    <h2 className="font-serif text-3xl sm:text-4xl mb-12 max-w-xl">
                        Everyone gets exactly the access they need.
                    </h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {[
                            [
                                "Owner",
                                "You. Full control, including billing and shop setup. For setup, not for working the till.",
                            ],
                            [
                                "Shop Manager",
                                "Runs the shop day to day. Creates staff and manager accounts, manages stock, opens cash-up.",
                            ],
                            [
                                "Manager",
                                "Handles products, stock and the sales floor for daily operations.",
                            ],
                            [
                                "Staff",
                                "Rings up sales, opens tables, takes payment. Nothing more, nothing less.",
                            ],
                        ].map(([title, desc]) => (
                            <div
                                key={title}
                                className="border border-[#E8DFCB] rounded-md p-6 bg-white"
                            >
                                <Icon.Users className="w-6 h-6 text-[#2B6CA3] mb-4" />
                                <h3 className="font-serif text-lg mb-2">
                                    {title}
                                </h3>
                                <p className="text-sm text-[#5C5346] leading-relaxed">
                                    {desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ---------------- FEATURES ---------------- */}
                <section
                    id="features"
                    className="border-t border-b border-[#E8DFCB] bg-[#F5F1E4]"
                >
                    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
                        <SectionEyebrow>What it does</SectionEyebrow>
                        <h2 className="font-serif text-3xl sm:text-4xl mb-12 max-w-xl">
                            Everything from a fast counter sale to the last
                            dollar at cash-up.
                        </h2>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            <FeatureCard
                                icon={Icon.Wifi}
                                title="Works without the internet"
                            >
                                Sales are recorded on the device the moment they
                                happen. When the network comes back, everything
                                syncs — no lost sales, no waiting on a signal to
                                serve a customer.
                            </FeatureCard>
                            <FeatureCard
                                icon={Icon.Table}
                                title="Fast sales and tables"
                            >
                                Ring up a quick counter sale, or open a table
                                for guests staying a while. Managers can move a
                                table between staff, void it, or defer it for a
                                walk-out.
                            </FeatureCard>
                            <FeatureCard
                                icon={Icon.Sync}
                                title="Sync before cash-up"
                            >
                                Every device pushes its sales in with one tap,
                                so cash-up always reflects the full day across
                                every till in the building.
                            </FeatureCard>
                            <FeatureCard
                                icon={Icon.Receipt}
                                title="Itemised cash-up"
                            >
                                A clear breakdown by payment method, printable
                                staff payouts, and the day's expenses — all in
                                one report at close.
                            </FeatureCard>
                            <FeatureCard
                                icon={Icon.Trash}
                                title="Nothing goes missing quietly"
                            >
                                Wasted stock, voided sales and deferred tables
                                all show up on the record at cash-up —
                                soft-deleted, never erased.
                            </FeatureCard>
                            <FeatureCard
                                icon={Icon.Pin}
                                title="PIN login on paired devices"
                            >
                                Pair a device once with a password. After that,
                                staff unlock it with a short PIN — quick enough
                                for a busy bar.
                            </FeatureCard>
                        </div>
                    </div>
                </section>

                {/* ---------------- FOR BARS ---------------- */}
                <section
                    id="for-bars"
                    className="max-w-6xl mx-auto px-5 sm:px-8 py-20"
                >
                    <SectionEyebrow>Two kinds of shop</SectionEyebrow>
                    <h2 className="font-serif text-3xl sm:text-4xl mb-6 max-w-lg">
                        Set up once for how you actually sell.
                    </h2>
                    <p className="text-[#5C5346] leading-relaxed mb-14 max-w-2xl">
                        When you create your shop, you choose its type. A plain{" "}
                        <strong className="text-[#241C15]">Shop</strong> keeps
                        everything in simple units — no bottles, no alcohol
                        setup. A <strong className="text-[#241C15]">Bar</strong>{" "}
                        or <strong className="text-[#241C15]">Resto-Bar</strong>{" "}
                        unlocks bottle stock, and that's also where you set your
                        shop's standard shot size, used automatically across
                        every bottle you stock.
                    </p>

                    <div className="grid lg:grid-cols-2 gap-14 items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Icon.Scale className="w-6 h-6 text-[#D8392A]" />
                                <h3 className="font-serif text-2xl text-[#241C15]">
                                    Weighed, not guessed
                                </h3>
                            </div>
                            <p className="text-[#5C5346] leading-relaxed mb-4 max-w-lg">
                                Bar and Resto-Bar stock is counted by weight —
                                tested for accuracy, not estimated. When you
                                create a bottle product, you enter three numbers
                                once: the bottle's{" "}
                                <strong className="text-[#241C15]">
                                    empty weight
                                </strong>
                                , its{" "}
                                <strong className="text-[#241C15]">
                                    full weight
                                </strong>
                                , and its{" "}
                                <strong className="text-[#241C15]">
                                    capacity
                                </strong>
                                .
                            </p>
                            <p className="text-[#5C5346] leading-relaxed max-w-lg">
                                Combined with the shot size you set for your
                                shop, Mom & Pop POS works out exactly how many
                                shots are left in any bottle — even one that's
                                already open and half poured — just from what it
                                weighs.
                            </p>
                        </div>

                        <div className="bg-white border border-[#E8DFCB] rounded-md p-7 font-mono text-sm">
                            <p className="text-[#8A8070] text-xs uppercase tracking-widest mb-5">
                                Example: Jack Daniels 750ml
                            </p>
                            <div className="space-y-3 text-[#5C5346]">
                                <div className="flex justify-between">
                                    <span>Empty bottle weight</span>
                                    <span className="text-[#241C15]">500g</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Full bottle weight</span>
                                    <span className="text-[#241C15]">
                                        1250g
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Capacity</span>
                                    <span className="text-[#241C15]">
                                        750ml
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Shop shot size</span>
                                    <span className="text-[#241C15]">25ml</span>
                                </div>
                                <div className="border-t border-[#E8DFCB] my-1" />
                                <div className="flex justify-between">
                                    <span>Shots per full bottle</span>
                                    <span className="text-[#D8392A]">30</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Weigh it mid-shift, get</span>
                                    <span className="text-[#D8392A]">
                                        exact shots left
                                    </span>
                                </div>
                            </div>
                            <div className="border-t border-[#E8DFCB] my-5" />
                            <p className="text-[#8A8070] text-xs uppercase tracking-widest mb-5">
                                Example: six-pack (any shop type)
                            </p>
                            <div className="space-y-3 text-[#5C5346]">
                                <div className="flex justify-between">
                                    <span>Add stock</span>
                                    <span className="text-[#241C15]">
                                        1 six-pack
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>System records</span>
                                    <span className="text-[#D8392A]">
                                        6 units
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ---------------- DOCS ---------------- */}
                <section
                    id="docs"
                    className="border-t border-[#E8DFCB] bg-[#F5F1E4]"
                >
                    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-20">
                        <SectionEyebrow>Documentation</SectionEyebrow>
                        <h2 className="font-serif text-3xl sm:text-4xl mb-6">
                            Everything explained, right here.
                        </h2>
                        <p className="text-[#5C5346] mb-8 max-w-xl">
                            Stock works a little differently depending on your
                            shop type — pick the one that matches your business
                            to see the right guide.
                        </p>

                        <div className="inline-flex rounded-md border border-[#E8DFCB] bg-white p-1 mb-10">
                            {[
                                ["shop", "Normal Shop"],
                                ["bar", "Bar & Resto-Bar"],
                            ].map(([value, label]) => (
                                <button
                                    key={value}
                                    onClick={() => {
                                        setShopType(value);
                                        setOpenDoc(0);
                                    }}
                                    className={`text-sm px-4 py-2 rounded-[5px] transition-colors ${
                                        shopType === value
                                            ? "bg-[#D8392A] text-white"
                                            : "text-[#5C5346] hover:text-[#241C15]"
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div>
                            {activeDocs.map((item, i) => (
                                <AccordionItem
                                    key={item.q}
                                    q={item.q}
                                    a={item.a}
                                    isOpen={openDoc === i}
                                    onClick={() =>
                                        setOpenDoc(openDoc === i ? -1 : i)
                                    }
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ---------------- DOWNLOADS ---------------- */}
                <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
                    <SectionEyebrow>Take it with you</SectionEyebrow>
                    <h2 className="font-serif text-3xl sm:text-4xl mb-12 max-w-xl">
                        Downloadable resources for you and your staff.
                    </h2>

                    <div className="grid sm:grid-cols-2 gap-5">
                        <div className="border border-[#E8DFCB] rounded-md p-7 flex flex-col bg-white">
                            <Icon.Receipt className="w-7 h-7 text-[#D8392A] mb-4" />
                            <h3 className="font-serif text-xl mb-2">
                                Quick Start Guide
                            </h3>
                            <p className="text-sm text-[#5C5346] leading-relaxed mb-6 flex-1">
                                A short PDF walking through setup, accounts,
                                stock and units, and how cash-up works — worth
                                printing and keeping by the till.
                            </p>
                            <button
                                onClick={printQuickStart}
                                className="inline-block text-sm px-5 py-2.5 rounded-md bg-[#D8392A] text-white font-medium hover:bg-[#c02f21] transition-colors w-fit"
                            >
                                Download the guide
                            </button>
                        </div>

                        <div className="border border-[#E8DFCB] rounded-md p-7 flex flex-col bg-white">
                            <Icon.Pin className="w-7 h-7 text-[#D8392A] mb-4" />
                            <h3 className="font-serif text-xl mb-2">
                                Staff Quick Reference
                            </h3>
                            <p className="text-sm text-[#5C5346] leading-relaxed mb-6 flex-1">
                                One page to print and pin up near the till —
                                logging in, fast sales versus tables, and the
                                one thing every staff member must do before
                                clocking off.
                            </p>
                            <button
                                onClick={printStaffSheet}
                                className="inline-block text-sm px-5 py-2.5 rounded-md border border-[#E8DFCB] text-[#241C15] hover:border-[#D8392A] transition-colors w-fit"
                            >
                                Download the cheat sheet
                            </button>
                        </div>
                    </div>
                </section>

                {/* ---------------- CONTACT / CTA ---------------- */}
                <section id="contact" className="bg-[#123D26] text-[#FFFCF5]">
                    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 grid lg:grid-cols-2 gap-14">
                        <div>
                            <SectionEyebrow tone="cream">
                                Get in touch
                            </SectionEyebrow>
                            <h2 className="font-serif text-3xl sm:text-4xl mb-6 max-w-md">
                                Based in Harare. Happy to talk before you sign
                                up.
                            </h2>
                            <p className="text-[#CFE3D3] leading-relaxed mb-8 max-w-md">
                                Questions about whether Mom & Pop POS fits your
                                shop or bar? Reach out directly — real answers,
                                no call centre.
                            </p>
                            <div className="space-y-4">
                                <a
                                    href="https://wa.me/263773270659"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 text-[#FFFCF5] hover:text-[#E4A23A] transition-colors w-fit"
                                >
                                    <Icon.Whatsapp className="w-5 h-5 text-[#E4A23A]" />
                                    <span>
                                        WhatsApp or call: +263 77 327 0659
                                    </span>
                                </a>
                                <a
                                    href="mailto:michael@michaelmwanza.site"
                                    className="flex items-center gap-3 text-[#FFFCF5] hover:text-[#E4A23A] transition-colors w-fit"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                        className="w-5 h-5 text-[#E4A23A]"
                                    >
                                        <rect
                                            x="3"
                                            y="5"
                                            width="18"
                                            height="14"
                                            rx="2"
                                        />
                                        <path d="M3 7l9 6 9-6" />
                                    </svg>
                                    <span>michael@michaelmwanza.site</span>
                                </a>
                            </div>
                            <p className="mt-8 text-xs text-[#8FB89B] font-mono max-w-md">
                                Outside Zimbabwe and interested? Get in touch —
                                a version for your country may be on the way.
                            </p>
                        </div>

                        <div className="flex flex-col justify-center bg-[#0E301D] border border-[#1C4E32] rounded-md p-10">
                            <h3 className="font-serif text-2xl mb-3">
                                Ready when you are.
                            </h3>
                            <p className="text-sm text-[#CFE3D3] leading-relaxed mb-7">
                                Create your account, set up your shop, and
                                you'll be ringing up sales the same day.
                            </p>
                            <Link
                                href={route("register")}
                                className="text-center px-6 py-3 rounded-md bg-[#D8392A] text-white font-medium hover:bg-[#c02f21] transition-colors"
                            >
                                Create your account
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ---------------- FOOTER ---------------- */}
                <footer className="border-t border-[#E8DFCB]">
                    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <ApplicationLogo className="h-8 w-auto" />
                        <p className="text-xs text-[#8A8070] font-mono">
                            © {new Date().getFullYear()} Mom & Pop POS · Harare,
                            Zimbabwe
                        </p>
                    </div>
                </footer>

                {/* Off-screen printable content — rendered for react-to-print, not visible on the page */}
                <div
                    style={{
                        position: "absolute",
                        left: "-99999px",
                        top: 0,
                        width: 0,
                        height: 0,
                        overflow: "hidden",
                    }}
                >
                    <div ref={quickStartRef}>
                        <QuickStartGuideContent />
                    </div>
                    <div ref={staffSheetRef}>
                        <StaffCheatSheetContent />
                    </div>
                </div>
            </div>
        </>
    );
}
