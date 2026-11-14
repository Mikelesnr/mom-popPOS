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
import { RemotePrintHost } from "./RemotePrintHost";
import DeviceStatusPill from "./DeviceStatusPill";

// What components get when there is no shop (owners, admins) or no provider.
const INERT = {
    enabled: false,
    peers: [],
    printers: [],
    routes: { bill: "", kitchen: "" },
    status: null,
    printBill: () => false,
    printKitchenTicket: () => {},
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
    return (
        <ActiveProvider shopId={user.shop_id} userName={user.name}>
            {children}
        </ActiveProvider>
    );
}

function ActiveProvider({ shopId, userName, children }) {
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
                .sendPrint(target, {
                    template: "bill",
                    title: props.title || "Bill",
                    props: { shopName: shopName || "Mom&Pop POS", ...props },
                })
                .then(() => toast.success(`Sent to ${name}`))
                .catch((err) => toast.error(`${name}: ${err.message}`));
            return true;
        },
        [engine, snap, shopName],
    );

    // Off unless a kitchen printer has been chosen on this device.
    const printKitchenTicket = useCallback(
        ({ tableName, items, isUpdate = false }) => {
            const target = snap.routes.kitchen;
            if (!target || !items?.length) return;
            const name = engine.nameOf(target);
            if (target !== snap.deviceId && !snap.peers.some((p) => p.id === target)) {
                // No fallback to this printer on purpose: a ticket that prints
                // at the bar never reaches the kitchen. Say so loudly.
                toast.error(`${name} is offline. Kitchen ticket NOT printed.`, {
                    duration: 8000,
                });
                return;
            }
            engine
                .sendPrint(target, {
                    template: "kitchen",
                    title: `Kitchen ${tableName || ""}`.trim(),
                    props: {
                        shopName: shopName || "Mom&Pop POS",
                        tableName,
                        staff: userName,
                        time: new Date().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        }),
                        isUpdate,
                        items: items.map((i) => ({
                            quantity: i.quantity,
                            name: i.name,
                            metadata: i.metadata,
                        })),
                    },
                })
                .catch((err) =>
                    toast.error(`${name}: ${err.message}. Kitchen ticket NOT printed.`, {
                        duration: 8000,
                    }),
                );
        },
        [engine, snap, shopName, userName],
    );

    const value = useMemo(
        () => ({
            enabled: true,
            deviceId: snap.deviceId,
            deviceName: snap.name,
            canPrint: snap.canPrint,
            peers: snap.peers,
            status: snap.status,
            routes: snap.routes,
            printers,
            setDeviceName: engine.setName,
            setCanPrint: engine.setCanPrint,
            setRoute: engine.setRoute,
            syncNow: engine.syncNow,
            printBill,
            printKitchenTicket,
            sendPrint,
        }),
        [snap, printers, engine, printBill, printKitchenTicket, sendPrint],
    );

    return (
        <DeviceSyncContext.Provider value={value}>
            {children}
            <RemotePrintHost ref={hostRef} />
            <DeviceStatusPill />
        </DeviceSyncContext.Provider>
    );
}
