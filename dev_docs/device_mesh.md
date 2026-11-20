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
3. On the device that has the bar or counter printer attached, tick "A printer
   is connected to this device". Bills and receipts print where they are rung,
   or on the device chosen under "Print bills on".
4. On the device that has the kitchen printer, tick "This is the kitchen
   device". That is all the setup the kitchen needs.
5. In Stock, open the category manager and tick "Kitchen category" on the
   categories that are cooked or prepared in the kitchen (food, grill, and so
   on). Existing categories have a "Kitchen" button that switches them on or off.

A manager on another phone now sees the same open tables live, and can add
items, defer or close a table without logging in on the device that opened it.

## Kitchen tickets and receipts

Every bill and receipt prints exactly as before, with all of the items on it,
bar and kitchen items together. Kitchen tickets are an addition:

- When an order is placed (Fast Sale), a table is opened, or items are added to
  a table, the items that belong to **kitchen categories** are also sent to every
  linked device marked "This is the kitchen device". Items from other
  categories are never on the kitchen ticket.
- The ticket shows who rang it up, the **table name** (or the **order number**
  for a fast sale), the time, and the quantities. No prices.
- Order numbers run 1, 2, 3 within a shift and carry on from orders that arrived
  from other devices. Two devices that cannot see each other can pick the same
  number, which is why the staff name and time are on the ticket too.
- A kitchen device that rings its own sales prints its own ticket.
- If a kitchen item is ordered and no kitchen device is linked, the sale is still
  saved and a message says "Kitchen ticket NOT printed" (naming the kitchen if
  it was seen before). There is deliberately no fallback to another printer,
  because a ticket that prints at the bar never reaches the kitchen.
- Which categories are kitchen categories reaches every device within a few
  seconds, with the regular device poll, so switching one mid-shift does not
  need anyone to press Sync. The flag that comes with the catalog is only used
  until the server has been heard once.

### Automatic receipts (managers)

By default nothing changes: receipts print when someone taps Print. A manager,
shop manager or the shop's owner can turn on "Print the customer's receipt
automatically when an order or table is paid" in the Shop devices panel. It
applies to every device in the shop. Businesses that hand every customer a slip
(fast food) can turn it on so nobody forgets; restaurants that only print a bill
on request can leave it off to save paper.

- The receipt goes to the chosen bill printer, or prints on the device that took
  the payment. If the chosen printer is offline it prints on that device.
- Saving the setting needs internet, because it lives on the server. Devices
  then pick it up with their next poll, and keep the last value they saw if the
  server cannot be reached.
- The server enforces who may change it (gate `manage-shop-print-settings`).

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
plain data to a device marked as a print station or as the kitchen device. That
device renders it and opens its own browser print dialog. The same print host
also prints jobs for this device itself, such as an automatic receipt.

To print without the dialog on a Windows or Linux PC attached to a receipt
printer, start Chrome with `--kiosk-printing` and set that printer as the
default. Phones and tablets will always show the dialog.

If the chosen bill printer is offline, the bill prints on the current device
instead. A kitchen ticket never falls back, because a ticket that prints at the
bar never reaches the kitchen. It shows a loud error instead. Printing never
blocks a sale: the order or table is always saved first.

The kitchen device accepts kitchen jobs without also being a bill printer, so
ticking "This is the kitchen device" does not make bills print there.

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

## What was added on the server

- `categories.is_kitchen` (default off) and `shops.auto_print_receipts` (default
  off), in one migration. Both default to the behaviour you had before.
- `CategoryController` accepts `is_kitchen` on create and update, and
  `CategoryMenuResource` sends it with the catalog.
- `PATCH /shops/{shop}/print-settings` (gate `manage-shop-print-settings`:
  owner of the shop, its managers and shop managers).
- `ShopPrintSettings` returns the shop's settings with every device poll and is
  cached for a minute. It is cleared whenever a category or the setting changes,
  so the next poll has the new values.
- `CategoryPolicy`. `CategoryController` already called `authorize('update')` and
  `authorize('delete')`, but no policy existed, so as far as the code goes those
  were refused for everyone. The new policy lets the shop's owner, managers and
  shop managers rename, delete and change categories, which also lets them mark
  a category as a kitchen category.
- Run the migration (`php artisan migrate`) before using any of this.

## Tests

`tests/js/README.md` explains how to run the JavaScript tests. They cover the
clock, merge rules, framing, replication between simulated devices (offline
catch up, conflicts, relay through a middle device, shop isolation), real WebRTC
data channels over loopback (including a server that trims whitespace like
Laravel does, a connection that never completes, and a browser without WebRTC),
printing, diagnostics, and the React provider and panel.
