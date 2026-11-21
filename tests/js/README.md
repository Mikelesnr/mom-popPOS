# JavaScript tests for the device mesh

The repo has no JS test tooling yet. These tests use Vitest and are not part of
`npm test`. To run them without changing `package.json`:

    npm install --no-save vitest fake-indexeddb node-datachannel jsdom \
        @testing-library/react @testing-library/dom

    # replication, WebRTC, printing, signaling client, updateTableItemsLocal
    npx vitest run --config tests/js/vitest.config.js

    # React provider, device panel, remote print host
    npx vitest run --config tests/js/vitest.ui.config.js

`node-datachannel` is a real WebRTC stack for Node, so `rtc.test.js` and
`engine.test.js` open actual data channels over loopback.

What each file covers:

- `sync/mesh.test.js`   clock, framing, merge rules, replication between simulated devices
- `sync/rtc.test.js`    real WebRTC links, signaling outage, restart and catch up, diagnostics, ICE servers, failure reporting
- `sync/engine.test.js` full engines: rename, print station, remote print, late-item warning
- `sync/print.test.js`  print jobs, duplicates, failures, vanished printer
- `sync/signaling.test.js`  HTTP client, CSRF headers, 419 handling
- `sync/updateTable.test.js` regression test for adding items to an open table
- `sync/orderNo.test.js` order numbers for kitchen tickets
- `ui/devices.test.jsx` provider, panel states and hints, printing through the host
- `ui/bar.test.jsx` bar slips: the bar device, who triggers a slip (waiter, cashier, bartender, managers on the floor or in the bar), and Fast Sale, Open Table and Update Table end to end
- `ui/kitchen.test.jsx` kitchen categories, the kitchen device, automatic receipts, the manager
  setting, and Fast Sale, Open Table, Update Table and Close Table end to end
