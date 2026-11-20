import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import { usePage } from "@inertiajs/react";
import toast from "react-hot-toast";
import { db } from "@/Utils/db";
import { getEngine } from "@/Sync/engine";
import { readCsrfHeaders } from "@/Sync/rtc";
import { RemotePrintHost } from "./RemotePrintHost";
import DeviceStatusPill from "./DeviceStatusPill";

// Roles allowed to change shop-wide print settings. The server enforces this
// too (gate: manage-shop-print-settings); this only decides what to show.
const SETTINGS_ROLES = ["manager", "shop_manager"];

const NO_SETTINGS = { autoPrintReceipts: false, kitchenCategoryIds: null };

// What components get when there is no shop (owners, admins) or no provider.
const INERT = {
    enabled: false,
    peers: [],
    printers: [],
    routes: { bill: "" },
    status: null,
    shopSettings: NO_SETTINGS,
    isKitchen: false,
    knownKitchens: [],
    canManageShop: false,
    isKitchenCategory: (category) => !!category?.is_kitchen,
    printBill: () => false,
    printKitchenTicket: () => false,
    autoPrintReceipt: () => false,
    sendPrint: async () => false,
};

const DeviceSyncContext = createContext(INERT);

/** Live device-mesh state and remote printing, safe to call anywhere. */
export const useDeviceSync = () => useContext(DeviceSyncContext);

export default function DeviceSyncProvider({ children }) {
    const user = usePage().props.auth?.user;
    if (!user?.shop_id) {
        return (
            <DeviceSyncContext.Provider value={INERT}>
                {children}
            </DeviceSyncContext.Provider>
        );
    }
    const role = user.role?.value ?? user.role;
    return (
        <ActiveProvider
            shopId={user.shop_id}
            userName={user.name}
            role={role}
        >
            {children}
        </ActiveProvider>
    );
}

function ActiveProvider({ shopId, userName, role, children }) {
    // The engine lives outside React, so moving between Inertia pages does not
    // tear down the connections to the other devices.
    const [engine] = useState(() => getEngine({ shopId, db }));
    const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot);

    const [shopName, setShopName] = useState(
        () => localStorage.getItem("terminal_shop_name") || "",
    );
    useEffect(() => {
        let alive = true;
        db.shops
            .get(shopId)
            .then((s) => {
                if (alive && s?.name) {
                    setShopName(s.name);
                    localStorage.setItem("terminal_shop_name", s.name);
                }
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [shopId]);

    // The component that actually prints on this device.
    const hostRef = useRef(null);
    useEffect(() => {
        engine.setPrintHost({
            enqueue: (job) =>
                hostRef.current
                    ? hostRef.current.enqueue(job)
                    : Promise.reject(new Error("Print screen not ready")),
        });
        return () => engine.setPrintHost(null);
    }, [engine]);

    // Surface the one replication event a human needs to act on.
    useEffect(
        () =>
            engine.onEvent((e) => {
                if (e.type === "anomaly" && e.kind === "item_after_close") {
                    toast.error(
                        `"${e.itemName}" was added to "${e.tableName}" after it was paid. Check the bill.`,
                        { duration: 10000 },
                    );
                }
            }),
        [engine],
    );

    const printers = useMemo(
        () => [
            ...(snap.canPrint
                ? [{ id: snap.deviceId, name: `${snap.name} (this device)` }]
                : []),
            ...snap.peers
                .filter((p) => p.canPrint)
                .map((p) => ({ id: p.id, name: p.name })),
        ],
        [snap],
    );

    const sendPrint = useCallback(
        async (targetId, job) => {
            try {
                await engine.sendPrint(targetId, job);
                return true;
            } catch (err) {
                toast.error(err.message || "Could not print");
                return false;
            }
        },
        [engine],
    );

    const billJob = useCallback(
        (props) => ({
            template: "bill",
            title: props.title || "Bill",
            props: { shopName: shopName || "Mom&Pop POS", ...props },
        }),
        [shopName],
    );

    // Returns true when the bill went to another device's printer, so the
    // caller can skip its own local print. Returns false to print here.
    const printBill = useCallback(
        (props) => {
            const target = snap.routes.bill;
            if (!target || target === snap.deviceId) return false;
            if (!snap.peers.some((p) => p.id === target)) {
                toast.error(
                    `${engine.nameOf(target)} is offline. Printing on this device instead.`,
                );
                return false;
            }
            const name = engine.nameOf(target);
            engine
                .sendPrint(target, billJob(props))
                .then(() => toast.success(`Sent to ${name}`))
                .catch((err) => toast.error(`${name}: ${err.message}`));
            return true;
        },
        [engine, snap, billJob],
    );

    // Print the customer's receipt right after an order or table is paid, if a
    // manager turned that on for the shop. Goes to the chosen bill printer,
    // or prints on this device. Returns true when it was sent.
    const autoPrintReceipt = useCallback(
        (props) => {
            if (!snap.shopSettings.autoPrintReceipts) return false;

            let target = snap.routes.bill || snap.deviceId;
            if (target !== snap.deviceId && !snap.peers.some((p) => p.id === target)) {
                toast.error(
                    `${engine.nameOf(target)} is offline. Printing the receipt on this device instead.`,
                );
                target = snap.deviceId;
            }
            const name = engine.nameOf(target);
            engine
                .sendPrint(target, billJob(props))
                .catch((err) => toast.error(`${name}: ${err.message}. Receipt NOT printed.`));
            return true;
        },
        [engine, snap, billJob],
    );

    // The kitchen devices that can take a ticket right now: this device if it
    // is the kitchen, plus every linked device that says it is.
    const kitchenTargets = useMemo(
        () => [
            ...(snap.isKitchen ? [{ id: snap.deviceId, name: snap.name }] : []),
            ...snap.peers.filter((p) => p.isKitchen).map((p) => ({ id: p.id, name: p.name })),
        ],
        [snap],
    );

    // Whether a category's items go to the kitchen. The live list from the
    // server wins, because it is current within seconds. The flag that came
    // with the catalog is only a fallback until the server has been heard.
    const isKitchenCategory = useCallback(
        (category) => {
            if (!category) return false;
            const ids = snap.shopSettings.kitchenCategoryIds;
            return ids ? ids.includes(String(category.id)) : !!category.is_kitchen;
        },
        [snap.shopSettings.kitchenCategoryIds],
    );

    // Sends the kitchen items (only those) to the kitchen printer. Items that
    // are not in a kitchen category stay on the normal bill only. Returns true
    // when a ticket was sent.
    const printKitchenTicket = useCallback(
        ({ tableName, orderNo, items, isUpdate = false }) => {
            const kitchenItems = (items || []).filter((i) => i.is_kitchen);
            if (kitchenItems.length === 0) return false;

            if (kitchenTargets.length === 0) {
                // No fallback to this printer on purpose: a ticket that prints
                // at the bar never reaches the kitchen. Say so loudly.
                const known = snap.knownKitchens.map((k) => k.name).join(", ");
                toast.error(
                    known
                        ? `${known} is offline. Kitchen ticket NOT printed.`
                        : "No kitchen device is linked. Kitchen ticket NOT printed.",
                    { duration: 8000 },
                );
                return false;
            }

            const job = {
                template: "kitchen",
                title: `Kitchen ${tableName || (orderNo ? `order ${orderNo}` : "")}`.trim(),
                props: {
                    shopName: shopName || "Mom&Pop POS",
                    tableName: tableName || null,
                    orderNo: orderNo ?? null,
                    staff: userName,
                    time: new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    isUpdate,
                    items: kitchenItems.map((i) => ({
                        quantity: i.quantity,
                        name: i.name,
                        metadata: i.metadata,
                    })),
                },
            };

            for (const t of kitchenTargets) {
                engine
                    .sendPrint(t.id, job)
                    .catch((err) =>
                        toast.error(`${t.name}: ${err.message}. Kitchen ticket NOT printed.`, {
                            duration: 8000,
                        }),
                    );
            }
            return true;
        },
        [engine, snap.knownKitchens, kitchenTargets, shopName, userName],
    );

    const canManageShop = SETTINGS_ROLES.includes(role);

    // Managers only (also enforced by the server). Needs internet, because the
    // setting lives on the server and reaches every device from there.
    const setAutoPrintReceipts = useCallback(
        async (value) => {
            try {
                const res = await fetch(`/shops/${shopId}/print-settings`, {
                    method: "PATCH",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        ...readCsrfHeaders(),
                    },
                    body: JSON.stringify({ auto_print_receipts: !!value }),
                });
                if (!res.ok) {
                    throw new Error(
                        res.status === 403
                            ? "Only managers can change this setting."
                            : "Could not save the setting.",
                    );
                }
                engine.applyShopSettings(await res.json());
                toast.success(
                    value
                        ? "Receipts will print automatically when an order or table is paid."
                        : "Automatic receipt printing is off.",
                );
                return true;
            } catch (err) {
                toast.error(
                    err instanceof TypeError
                        ? "Could not save. This setting needs an internet connection."
                        : err.message,
                );
                return false;
            }
        },
        [engine, shopId],
    );

    const value = useMemo(
        () => ({
            enabled: true,
            deviceId: snap.deviceId,
            deviceName: snap.name,
            canPrint: snap.canPrint,
            isKitchen: snap.isKitchen,
            knownKitchens: snap.knownKitchens,
            shopSettings: snap.shopSettings,
            canManageShop,
            peers: snap.peers,
            status: snap.status,
            denied: snap.denied,
            getDiagnostics: engine.getDiagnostics,
            routes: snap.routes,
            printers,
            setDeviceName: engine.setName,
            setCanPrint: engine.setCanPrint,
            setKitchen: engine.setKitchen,
            setRoute: engine.setRoute,
            setAutoPrintReceipts,
            syncNow: engine.syncNow,
            isKitchenCategory,
            printBill,
            printKitchenTicket,
            autoPrintReceipt,
            sendPrint,
        }),
        [
            snap,
            printers,
            engine,
            canManageShop,
            setAutoPrintReceipts,
            isKitchenCategory,
            printBill,
            printKitchenTicket,
            autoPrintReceipt,
            sendPrint,
        ],
    );

    return (
        <DeviceSyncContext.Provider value={value}>
            {children}
            <RemotePrintHost ref={hostRef} />
            <DeviceStatusPill />
        </DeviceSyncContext.Provider>
    );
}
