# Device mesh: live sync and remote printing

Devices in the same shop keep their local Dexie data in step with each other
over WebRTC, and can send print jobs to each other. There is no main machine.
Every device holds a full copy, and any of them can be switched off at any time
without the others noticing anything except that one fewer device is linked.

This replaces the "one PC is the server" model of older till software, where
that PC going down takes every till down with it.

## Using it

1. Sign in on each phone or tablet as usual. A small pill appears at the bottom
   left of the screen ("Alone", "2 linked").
2. Tap it. Give the device a name (Bar, Kitchen, Manager phone).
3. On the device that has a printer attached, tick "A printer is connected to
   this device".
4. On any device, choose where bills print and where kitchen tickets go.
   Kitchen tickets are off until a kitchen printer is chosen, so nothing
   changes for shops that do not use this.

A manager on another phone now sees the same open tables live, and can add
items, defer or close a table without logging in on the device that opened it.

## How it fits together

    resources/js/Sync/
      hlc.js          hybrid logical clock (who edited last, despite wrong phone clocks)
      merge.js        which copy of a record wins
      replicator.js   Dexie hooks, digests, merge, forwarding
      rtc.js          WebRTC mesh + HTTP signaling client
      print.js        send a print job to another device
      engine.js       one device's identity, wiring, and state for the UI
      bus.js          transport-neutral message bus
      framing.js      splits big messages into small data channel frames
    resources/js/Components/Devices/
      DeviceSyncProvider.jsx   React context, mounted in AuthenticatedLayout
      DeviceStatusPill.jsx     the pill and settings panel
      RemotePrintHost.jsx      renders and prints jobs on this device
    app/Http/Controllers/Devices/DeviceSignalController.php
    routes/devices.php        (required from web.php, gate: join-device-mesh)

The server is only a switchboard. It says who is online and passes the short
connection set-up messages between devices. It never sees orders. Once two
devices are connected their data goes directly over the shop Wi-Fi.

### What replicates

`users`, `orders`, `open_tables`, `order_items`. Catalog, stock counts and stock
worksheets stay local on purpose. Only the working set is compared: the current
shift plus anything not yet uploaded.

### Conflict rules

- Every write is stamped with a hybrid logical clock. The higher stamp wins.
- A table only moves forward: open, then deferred, then closed or void. A
  "closed" can never be undone by a newer "open" edit made elsewhere.
- Items are append only. Two people adding to the same table at once keep both
  sets of items, and the table total is recomputed from the items.
- If an item is rung onto a table after it was paid, the device that took the
  payment shows a warning so the bill can be checked.
- Records from another shop are rejected, whatever a peer claims.

### Printing

A browser cannot see or drive another machine's printer, so the job travels as
plain data to a device marked as a print station. That device renders it and
opens its own browser print dialog.

To print without the dialog on a Windows or Linux PC attached to a receipt
printer, start Chrome with `--kiosk-printing` and set that printer as the
default. Phones and tablets will always show the dialog.

If the chosen bill printer is offline, the bill prints on the current device
instead. A kitchen ticket never falls back, because a ticket that prints at the
bar never reaches the kitchen. It shows a loud error instead.

## If devices do not link

Open the pill on the device, then the panel. It now separates three stages:

1. **Is the server reachable?** "No server" means the device cannot reach
   Laravel at all. "Not allowed" means the server refused it (HTTP 403 or 419),
   so sign out and in again and check the account's role.
2. **Does the server see the other device?** "Alone" with the hint "No other
   device is online" means no other device is polling. The other device must be
   signed in with the app open on screen. Phones pause pages that are in the
   background or have the screen off, and a device drops off the list about 30
   seconds after its last poll.
3. **Can the two devices open a direct link?** "1 found, not linked" means the
   server sees the other device but the WebRTC link failed. The row shows the
   reason and how many network addresses each side offered. That points at the
   network, not at the app.

Tap **Copy diagnostics** on both devices and send the text. It contains the
device and browser details, what the server returned, and a timeline of every
step (offer made, answer received, ICE state, how each link ended).

Things that can stop a direct link even though QuickShare works. QuickShare
uses Bluetooth and Wi-Fi Direct, so it says nothing about whether the Wi-Fi
lets devices talk to each other.

- Browsers hide a device's real address behind a random `name.local` (mDNS).
  The other device has to resolve that name with multicast. Many phone hotspots
  and some routers do not pass multicast between clients, so the link fails.
- Client or AP isolation on the router.
- A VPN or Private DNS on either device.
- Two devices that are not actually on the same network (for example one on
  mobile data).

### STUN and TURN

`config/mesh.php` (env: `MESH_STUN_URLS`, `MESH_TURN_URLS`, `MESH_TURN_SECRET`,
`MESH_TURN_TTL`) controls the helper servers handed to devices at the next poll.
No frontend rebuild is needed.

- STUN is on by default (a public Google server). It helps devices learn their
  public address. It will not rescue every network.
- TURN is off by default. It relays traffic through a server you run, so it
  works on almost any network, but it needs internet while it is in use and it
  sends shop traffic through that server. To use it, run coturn with
  `use-auth-secret` and `static-auth-secret=<the same secret>`, open its ports
  in the firewall, then set `MESH_TURN_URLS=turn:your.host:3478` and
  `MESH_TURN_SECRET`. Devices receive short lived credentials, never the secret.

If diagnostics show that the real shop networks block direct links, the next
step is a fallback that relays data through the server while a direct link is
not possible.

## What internet is needed for

Setting up a link between two devices needs the server, for a few seconds.
After that, data flows over the local network, and replication carries on if the
internet drops. If a link breaks while the internet is down, that pair cannot
reconnect until the internet is back. Phone-to-phone pairing without any
internet (for example by scanning a QR code) is a good next step and the
signaling layer is written so it can be swapped in.

## Before turning this on in production

1. Apply `optional-server-dedup-stock.patch` (or the same one-line change).
   `SyncOrdersController::persistOrderItem` currently deducts stock every time
   it sees an item, including when the same item is uploaded again. That
   already happens today after a retry, and with several devices holding copies
   of the same items it becomes much more likely. The patch deducts only when
   the item is created.
2. Run `php artisan test --filter DeviceSignalTest` on your machine. It was
   written against your factories and routes but could not be run where it was
   developed.
3. Try it on a real shop network with two or three real devices. See below.

## Known limits

- Wi-Fi "client isolation" (common on guest networks and some ISP routers)
  stops devices from reaching each other. The panel explains this when it
  suspects it.
- Phones throttle or suspend browser tabs when the screen is off or the app is
  in the background. A suspended device drops out of the mesh and catches up
  when it wakes, using the digest exchange. Keep the kitchen print device
  awake and in the foreground.
- A very wrong phone clock is tolerated (clocks more than an hour ahead are
  clamped) but still means a device's edits are ordered by a wrong time.
- Deletes are not replicated. Replicated tables are append and update only.
- Peers are trusted as staff of the shop. Server side upload validation remains
  the authority on what is accepted into the ledger.

## Tests

`tests/js/README.md` explains how to run the JavaScript tests. They cover the
clock, merge rules, framing, replication between simulated devices (offline
catch up, conflicts, relay through a middle device, shop isolation), real WebRTC
data channels over loopback (including a server that trims whitespace like
Laravel does, a connection that never completes, and a browser without WebRTC),
printing, diagnostics, and the React provider and panel.
