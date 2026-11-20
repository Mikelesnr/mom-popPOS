import React, { useState } from "react";
import { useDeviceSync } from "./DeviceSyncProvider";

/**
 * Small floating indicator for the shop's device network, with a panel to
 * name this device, mark it as a print station, choose where bills and
 * kitchen tickets print, and see exactly why other devices are not linking.
 */
export default function DeviceStatusPill() {
    const sync = useDeviceSync();
    const [open, setOpen] = useState(false);
    const [nameDraft, setNameDraft] = useState(null);
    const [diagText, setDiagText] = useState("");
    const [copied, setCopied] = useState(false);
    const [savingSetting, setSavingSetting] = useState(false);

    if (!sync.enabled) return null;

    const status = sync.status || {};
    const linkedIds = new Set(sync.peers.map((p) => p.id));
    const linked = sync.peers.length;
    const online = status.online || [];
    const notLinked = online.filter((p) => !linkedIds.has(p.id));
    const serverDown = status.signaling === false;

    let dot = "bg-stone-400";
    let label = "Alone";
    if (sync.denied) {
        dot = "bg-red-500";
        label = "Not allowed";
    } else if (linked > 0) {
        dot = notLinked.length ? "bg-amber-500" : "bg-emerald-500";
        label = notLinked.length ? `${linked} linked, ${notLinked.length} not` : `${linked} linked`;
    } else if (notLinked.length > 0) {
        dot = "bg-amber-500";
        label = `${notLinked.length} found, not linked`;
    } else if (serverDown) {
        dot = "bg-amber-500";
        label = "No server";
    }

    const commitName = () => {
        if (nameDraft !== null && nameDraft.trim()) sync.setDeviceName(nameDraft);
        setNameDraft(null);
    };

    const copyDiagnostics = async () => {
        const text = JSON.stringify(sync.getDiagnostics(), null, 2);
        setDiagText(text);
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Clipboard is blocked on non-secure pages. The text box below lets
            // the user select and copy it by hand.
            setCopied(false);
        }
    };

    // One row per device we know about: linked, or seen by the server.
    const rows = [
        ...sync.peers.map((p) => ({ ...p, linked: true })),
        ...notLinked.map((p) => ({ ...p, linked: false })),
    ];
    const connFor = (id) => (status.connections || []).find((c) => c.id === id);

    const describe = (row) => {
        if (row.linked) {
            const c = connFor(row.id);
            return c?.path ? `Direct link (${c.path})` : "Linked";
        }
        const c = connFor(row.id);
        if (!c) return "Seen by the server. Waiting for the connection to start.";
        if (c.state === "failed") return c.reason || "Connection failed";
        const last = c.lastFailure ? ` Last attempt failed: ${c.lastFailure.reason}` : "";
        return `Connecting${c.ice ? ` (${c.ice})` : ""}, attempt ${c.attempts || 1}.${last}`;
    };

    // Most important explanation first.
    let hint = null;
    if (sync.denied) {
        hint = `The server refused this device${status.httpStatus ? ` (HTTP ${status.httpStatus})` : ""}. Sign out and sign in again. If it keeps happening, this account may not be allowed to run a terminal.`;
    } else if (status.webrtcUnsupported) {
        hint = "This browser does not support WebRTC, so devices cannot link. Use an up to date Chrome, Edge, Firefox or Safari.";
    } else if (serverDown && linked === 0) {
        hint = "Cannot reach the server to find other devices. Devices that are already linked keep working without internet.";
    } else if (online.length === 0 && linked === 0) {
        hint = "No other device is online in this shop right now. The other device must be signed in with Mom&Pop open on screen. Phones pause pages that are in the background or have the screen off.";
    } else if (notLinked.length > 0 && linked === 0) {
        hint = "The server can see the other device, but a direct link could not be opened. That is usually the Wi-Fi or hotspot not letting devices reach each other, or hiding their addresses. Try the same normal Wi-Fi on both, switch off any VPN, then tap Copy diagnostics and send it to the developer.";
    }

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
                <div className="fixed inset-x-3 bottom-16 z-50 max-h-[75vh] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl sm:inset-x-auto sm:left-3 sm:w-80">
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
                    <label className="flex min-h-[44px] items-center gap-3 text-sm text-stone-700">
                        <input
                            type="checkbox"
                            checked={sync.isKitchen}
                            onChange={(e) => sync.setKitchen(e.target.checked)}
                            className="h-5 w-5 rounded border-stone-300 text-[#14352E] focus:ring-[#14352E]"
                        />
                        This is the kitchen device
                    </label>
                    {sync.isKitchen && (
                        <p className="mb-1 text-xs text-stone-500">
                            Items from kitchen categories print here automatically, whichever
                            device takes the order. Bills and receipts still print where
                            they are rung.
                        </p>
                    )}

                    {/* Other devices */}
                    <div className="mt-4 border-t border-stone-100 pt-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                            Other devices
                        </p>
                        {rows.length > 0 && (
                            <ul className="space-y-1.5">
                                {rows.map((p) => (
                                    <li key={p.id} className="rounded-lg bg-stone-50 px-3 py-2 text-sm">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-medium text-stone-800">{p.name}</span>
                                            <span className="flex items-center gap-1.5">
                                                {p.isKitchen && (
                                                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800">
                                                        Kitchen
                                                    </span>
                                                )}
                                                {p.canPrint && (
                                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                                        Printer
                                                    </span>
                                                )}
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                        p.linked
                                                            ? "bg-emerald-100 text-emerald-800"
                                                            : "bg-stone-200 text-stone-700"
                                                    }`}
                                                >
                                                    {p.linked ? "Linked" : "Not linked"}
                                                </span>
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-stone-500">{describe(p)}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {hint && (
                            <p
                                className={`mt-2 rounded-lg p-2.5 text-xs ${
                                    sync.denied
                                        ? "bg-red-50 text-red-800"
                                        : "bg-amber-50 text-amber-900"
                                }`}
                            >
                                {hint}
                            </p>
                        )}
                    </div>

                    {/* Print routing */}
                    <div className="mt-4 space-y-3 border-t border-stone-100 pt-3">
                        <RouteSelect
                            label="Print bills on"
                            value={sync.routes.bill}
                            onChange={(v) => sync.setRoute("bill", v)}
                            printers={printerOptions}
                            emptyLabel="This device (browser print)"
                        />
                        {sync.routes.bill &&
                            !printerOptions.some((p) => p.id === sync.routes.bill) && (
                                <p className="text-xs text-amber-700">
                                    The chosen bill printer is offline right now.
                                </p>
                            )}
                    </div>

                    {/* Shop-wide settings, managers only */}
                    {sync.canManageShop && (
                        <div className="mt-4 border-t border-stone-100 pt-3">
                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                                Shop settings
                            </p>
                            <label className="flex min-h-[44px] items-start gap-3 text-sm text-stone-700">
                                <input
                                    type="checkbox"
                                    checked={sync.shopSettings.autoPrintReceipts}
                                    disabled={savingSetting}
                                    onChange={async (e) => {
                                        setSavingSetting(true);
                                        await sync.setAutoPrintReceipts(e.target.checked);
                                        setSavingSetting(false);
                                    }}
                                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-stone-300 text-[#14352E] focus:ring-[#14352E]"
                                />
                                <span>
                                    Print the customer's receipt automatically when an order
                                    or table is paid
                                    <span className="block text-xs text-stone-500">
                                        Applies to every device in the shop. Turn it off to
                                        save paper and print only when asked.
                                    </span>
                                </span>
                            </label>
                        </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => sync.syncNow()}
                            disabled={linked === 0}
                            className="min-h-[44px] rounded-lg bg-stone-100 text-sm font-semibold text-stone-700 hover:bg-stone-200 disabled:opacity-40"
                        >
                            Sync now
                        </button>
                        <button
                            type="button"
                            onClick={copyDiagnostics}
                            className="min-h-[44px] rounded-lg bg-stone-100 text-sm font-semibold text-stone-700 hover:bg-stone-200"
                        >
                            {copied ? "Copied" : "Copy diagnostics"}
                        </button>
                    </div>

                    {diagText && (
                        <div className="mt-3">
                            <p className="mb-1 text-xs text-stone-500">
                                {copied
                                    ? "Copied. Paste it into a message."
                                    : "Select all of this text, copy it and send it to the developer."}
                            </p>
                            <textarea
                                readOnly
                                value={diagText}
                                onFocus={(e) => e.target.select()}
                                className="h-32 w-full rounded-lg border border-stone-300 bg-stone-50 p-2 font-mono text-[10px]"
                            />
                        </div>
                    )}
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
