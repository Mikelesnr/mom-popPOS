<?php

// Device mesh (WebRTC) settings. See dev_docs/device_mesh.md.
return [

    // STUN lets a device learn its public address. It helps when devices are
    // on different networks or the Wi-Fi hides local addresses. A comma
    // separated list. Leave empty for strictly local-only connections.
    'stun_urls' => array_filter(array_map('trim', explode(',', env('MESH_STUN_URLS', 'stun:stun.l.google.com:19302')))),

    // TURN relays traffic when no direct path exists (some hotspots and
    // routers). Optional. Needs a TURN server such as coturn with
    // "use-auth-secret" and the same shared secret. Traffic then goes through
    // that server, so it needs internet while it is in use.
    'turn_urls' => array_filter(array_map('trim', explode(',', env('MESH_TURN_URLS', '')))),
    'turn_secret' => env('MESH_TURN_SECRET'),
    'turn_ttl' => (int) env('MESH_TURN_TTL', 3600),
];
