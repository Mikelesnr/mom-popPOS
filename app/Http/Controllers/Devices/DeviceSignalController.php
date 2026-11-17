<?php

namespace App\Http\Controllers\Devices;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Switchboard for the shop's device mesh.
 *
 * Devices in a shop talk to each other directly over WebRTC (see
 * resources/js/Sync). This controller does only two things for them:
 *
 *  1. Presence: which devices of this shop are online right now.
 *  2. Mailbox: pass the short connection-setup messages (offer, answer, ice)
 *     from one device to another.
 *
 * It never sees order data. Everything is scoped to the caller's own shop_id
 * and lives in the cache with short expiry, so nothing is stored long term.
 * Authorization is in routes/devices.php.
 */
class DeviceSignalController extends Controller
{
    // A device disappears from the list this long after its last poll.
    private const PRESENCE_TTL = 30;

    // Unread setup messages are dropped after this long.
    private const MAILBOX_TTL = 120;

    // Newest messages win if a device never reads its mailbox.
    private const MAILBOX_MAX = 100;

    // An SDP is a few KB. Anything much bigger is not a setup message.
    private const PAYLOAD_MAX_CHARS = 20000;

    /**
     * POST /devices/poll
     * Heartbeat + "who else is here" + "any setup messages for me".
     */
    public function poll(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'device_id' => ['required', 'uuid'],
            'name' => ['nullable', 'string', 'max:40'],
            'can_print' => ['sometimes', 'boolean'],
        ]);

        $shopId = $user->shop_id;
        $deviceId = $data['device_id'];

        Cache::put($this->presenceKey($shopId, $deviceId), [
            'device_id' => $deviceId,
            'name' => $data['name'] ?? 'Device ' . strtoupper(substr($deviceId, 0, 4)),
            'can_print' => (bool) ($data['can_print'] ?? false),
            'user_name' => $user->name,
        ], self::PRESENCE_TTL);

        $this->ensureListed($shopId, $deviceId);

        return response()->json([
            'server_time' => now()->toIso8601String(),
            'peers' => $this->peers($shopId, $deviceId),
            'messages' => $this->drainMailbox($shopId, $deviceId),
            'ice_servers' => $this->iceServers($user),
        ]);
    }

    /**
     * POST /devices/signal
     * Hand one setup message to another device of the same shop.
     */
    public function signal(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'device_id' => ['required', 'uuid'],
            'to' => ['required', 'uuid', 'different:device_id'],
            'type' => ['required', Rule::in(['offer', 'answer', 'ice'])],
            'sid' => ['required', 'string', 'max:64'],
            // A JSON string, not an object: Laravel's whitespace trimming would
            // cut the trailing line break off an SDP. The server never looks
            // inside it, it only passes it on.
            'payload' => ['required', 'string', 'max:' . self::PAYLOAD_MAX_CHARS],
        ]);

        $shopId = $user->shop_id;

        // Both ends must currently be online in THIS shop. Presence keys are
        // prefixed with the shop id, so a device id from another shop simply
        // is not found.
        if (!Cache::has($this->presenceKey($shopId, $data['device_id']))
            || !Cache::has($this->presenceKey($shopId, $data['to']))) {
            return response()->json(['error' => 'unknown_peer'], 422);
        }

        $key = $this->mailboxKey($shopId, $data['to']);
        Cache::lock($key . ':lock', 5)->block(3, function () use ($key, $data) {
            $box = Cache::get($key, []);
            $box[] = [
                'id' => (string) Str::uuid(),
                'from' => $data['device_id'],
                'type' => $data['type'],
                'sid' => $data['sid'],
                'payload' => $data['payload'],
            ];
            if (count($box) > self::MAILBOX_MAX) {
                $box = array_slice($box, -self::MAILBOX_MAX);
            }
            Cache::put($key, $box, self::MAILBOX_TTL);
        });

        return response()->noContent();
    }

    /**
     * POST /devices/leave
     * Called when a tab closes so peers stop seeing a device that is gone.
     */
    public function leave(Request $request)
    {
        $data = $request->validate(['device_id' => ['required', 'uuid']]);
        $shopId = $request->user()->shop_id;

        Cache::forget($this->presenceKey($shopId, $data['device_id']));
        Cache::forget($this->mailboxKey($shopId, $data['device_id']));

        return response()->noContent();
    }

    // ------------------------------------------------------------------

    /**
     * STUN/TURN servers the devices should use when they connect. Configured in
     * config/mesh.php. TURN credentials are short lived (coturn "REST API"
     * style: username is an expiry time, password is an HMAC of it), so they
     * are safe to hand to the browser.
     */
    private function iceServers($user): array
    {
        $servers = [];

        $stun = array_values(array_filter((array) config('mesh.stun_urls', [])));
        if ($stun) {
            $servers[] = ['urls' => $stun];
        }

        $turn = array_values(array_filter((array) config('mesh.turn_urls', [])));
        $secret = config('mesh.turn_secret');
        if ($turn && $secret) {
            $username = (time() + (int) config('mesh.turn_ttl', 3600)) . ':' . $user->id;
            $servers[] = [
                'urls' => $turn,
                'username' => $username,
                'credential' => base64_encode(hash_hmac('sha1', $username, $secret, true)),
            ];
        }

        return $servers;
    }

    private function presenceKey(string $shopId, string $deviceId): string
    {
        return "mesh:{$shopId}:presence:{$deviceId}";
    }

    private function mailboxKey(string $shopId, string $deviceId): string
    {
        return "mesh:{$shopId}:mail:{$deviceId}";
    }

    private function indexKey(string $shopId): string
    {
        return "mesh:{$shopId}:index";
    }

    // The index lists device ids per shop so we can find presence entries
    // without scanning the cache. Entries whose presence has expired are
    // pruned the next time someone reads the list.
    private function ensureListed(string $shopId, string $deviceId): void
    {
        $key = $this->indexKey($shopId);
        if (in_array($deviceId, Cache::get($key, []), true)) {
            return;
        }
        Cache::lock($key . ':lock', 5)->block(3, function () use ($key, $deviceId) {
            $ids = Cache::get($key, []);
            if (!in_array($deviceId, $ids, true)) {
                $ids[] = $deviceId;
                Cache::put($key, array_values($ids), 86400);
            }
        });
    }

    private function peers(string $shopId, string $selfId): array
    {
        $key = $this->indexKey($shopId);
        $peers = [];
        $dead = [];

        foreach (Cache::get($key, []) as $id) {
            $entry = Cache::get($this->presenceKey($shopId, $id));
            if ($entry === null) {
                $dead[] = $id;
                continue;
            }
            if ($id !== $selfId) {
                $peers[] = $entry;
            }
        }

        if ($dead) {
            Cache::lock($key . ':lock', 5)->block(3, function () use ($key, $dead) {
                Cache::put($key, array_values(array_diff(Cache::get($key, []), $dead)), 86400);
            });
        }

        return $peers;
    }

    private function drainMailbox(string $shopId, string $deviceId): array
    {
        $key = $this->mailboxKey($shopId, $deviceId);
        if (!Cache::has($key)) {
            return [];
        }

        return Cache::lock($key . ':lock', 5)->block(3, function () use ($key) {
            $box = Cache::get($key, []);
            Cache::forget($key);
            return $box;
        });
    }
}
