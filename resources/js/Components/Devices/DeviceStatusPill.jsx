import React, { useState } from "react";
import { useDeviceSync } from "./DeviceSyncProvider";

/**
 * Small floating indicator for the shop's device network, with a panel to
 * name this device, mark it as a print station, and choose where bills and
 * kitchen tickets print.
 */
export default function DeviceStatusPill() {
    const sync = useDeviceSync();
    const [open, setOpen] = useState(false);
    const [nameDraft, setNameDraft] = useState(null);

    if (!sync.enabled) return null;

    const linked = sync.peers.length;
    const offline = sync.status?.signaling === false;

    let dot = "bg-stone-400";
    let label = "Alone";
    if (linked > 0) {
        dot = "bg-emerald-500";
        label = `${linked} linked`;
    } else if (offline) {
        dot = "bg-amber-500";
        label = "No link";
    }

    const commitName = () => {
        if (nameDraft !== null && nameDraft.trim()) sync.setDeviceName(nameDraft);
        setNameDraft(null);
    };

    const printerOptions = sync.printers;

    return (
        <div className="print:hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="fixed bottom-3 left-3 z-40 flex items-center gap-2 rounded-full bg-[#14352E] px-3.5 py-2 text-xs font-semibold text-white shadow-lg ring-1 ring-black/10 active:scale-95"
                aria-label="Devices in this shop"
            >
                <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                {label}
            </button>

            {open && (
                <div className="fixed inset-x-3 bottom-16 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl sm:inset-x-auto sm:left-3 sm:w-80">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-bold text-stone-900">Shop devices</h3>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="min-h-[36px] min-w-[36px] rounded-full text-stone-400 hover:bg-stone-100"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>

                    {/* This device */}
                    <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                        This device
                    </label>
                    <input
                        value={nameDraft ?? sync.deviceName}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onBlur={commitName}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                        maxLength={40}
                        className="mt-1 w-full rounded-lg border border-stone-300 p-2.5 text-sm focus:border-[#14352E] focus:outline-none focus:ring-2 focus:ring-[#14352E]/30"
                        placeholder="e.g. Kitchen, Bar, Manager phone"
                    />
                    <label className="mt-3 flex min-h-[44px] items-center gap-3 text-sm text-stone-700">
                        <input
                            type="checkbox"
                            checked={sync.canPrint}
                            onChange={(e) => sync.setCanPrint(e.target.checked)}
                            className="h-5 w-5 rounded border-stone-300 text-[#14352E] focus:ring-[#14352E]"
                        />
                        A printer is connected to this device
                    </label>

                    {/* Other devices */}
                    <div className="mt-4 border-t border-stone-100 pt-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                            Connected devices
                        </p>
                        {linked === 0 ? (
                            <p className="text-sm text-stone-500">
                                {offline
                                    ? "Cannot reach the server to find other devices. Devices already linked keep working without internet."
                                    : "No other device is linked yet. Open Mom&Pop on another phone or tablet in this shop."}
                            </p>
                        ) : (
                            <ul className="space-y-1.5">
                                {sync.peers.map((p) => (
                                    <li
                                        key={p.id}
                                        className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm"
                                    >
                                        <span className="font-medium text-stone-800">
                                            {p.name}
                                        </span>
                                        {p.canPrint && (
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                                Printer
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {sync.status?.failed?.length > 0 && linked === 0 && (
                            <p className="mt-2 text-xs text-amber-700">
                                Could not link to {sync.status.failed.length} device(s).
                                If they are on the same Wi-Fi, check that the router
                                is not blocking devices from seeing each other
                                (called "client isolation" or "AP isolation").
                            </p>
                        )}
                    </div>

                    {/* Print routing */}
                    <div className="mt-4 border-t border-stone-100 pt-3 space-y-3">
                        <RouteSelect
                            label="Print bills on"
                            value={sync.routes.bill}
                            onChange={(v) => sync.setRoute("bill", v)}
                            printers={printerOptions}
                            emptyLabel="This device (browser print)"
                        />
                        <RouteSelect
                            label="Send kitchen tickets to"
                            value={sync.routes.kitchen}
                            onChange={(v) => sync.setRoute("kitchen", v)}
                            printers={printerOptions}
                            emptyLabel="Off"
                        />
                        {[sync.routes.bill, sync.routes.kitchen].some(
                            (id) =>
                                id &&
                                !printerOptions.some((p) => p.id === id),
                        ) && (
                            <p className="text-xs text-amber-700">
                                A chosen printer is offline right now.
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => sync.syncNow()}
                        disabled={linked === 0}
                        className="mt-4 min-h-[44px] w-full rounded-lg bg-stone-100 text-sm font-semibold text-stone-700 hover:bg-stone-200 disabled:opacity-40"
                    >
                        Sync with other devices now
                    </button>
                </div>
            )}
        </div>
    );
}

function RouteSelect({ label, value, onChange, printers, emptyLabel }) {
    // Keep showing a saved choice even while that printer is offline.
    const missing = value && !printers.some((p) => p.id === value);
    return (
        <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                {label}
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-300 bg-white p-2.5 text-sm focus:border-[#14352E] focus:outline-none focus:ring-2 focus:ring-[#14352E]/30"
            >
                <option value="">{emptyLabel}</option>
                {printers.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name}
                    </option>
                ))}
                {missing && <option value={value}>Saved printer (offline)</option>}
            </select>
        </div>
    );
}
