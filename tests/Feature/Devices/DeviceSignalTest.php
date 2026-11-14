<?php

namespace Tests\Feature\Devices;

use App\Enums\ShopType;
use App\Enums\UserRole;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Tests\TestCase;

class DeviceSignalTest extends TestCase
{
    use RefreshDatabase;

    private function shop(string $name = 'Harare Central'): Shop
    {
        return Shop::create([
            'name' => $name,
            'shop_type' => ShopType::BAR,
            'latitude' => -17.8292,
            'longitude' => 31.0522,
            'allowed_radius' => 150,
        ]);
    }

    private function staff(Shop $shop, UserRole $role = UserRole::CASHIER): User
    {
        return User::factory()->create(['shop_id' => $shop->id, 'role' => $role]);
    }

    private function poll(User $user, string $deviceId, array $extra = [])
    {
        return $this->actingAs($user)->postJson('/devices/poll', array_merge([
            'device_id' => $deviceId,
            'name' => 'Bar',
            'can_print' => false,
        ], $extra));
    }

    public function test_guests_and_people_without_a_shop_are_kept_out(): void
    {
        $this->postJson('/devices/poll', ['device_id' => (string) Str::uuid()])->assertUnauthorized();

        $owner = User::factory()->owner()->create(); // shop_id is null
        $this->actingAs($owner)
            ->postJson('/devices/poll', ['device_id' => (string) Str::uuid()])
            ->assertForbidden();
    }

    public function test_a_device_sees_the_other_devices_in_its_own_shop(): void
    {
        $shop = $this->shop();
        $bar = (string) Str::uuid();
        $kitchen = (string) Str::uuid();

        $this->poll($this->staff($shop), $bar)->assertOk()->assertJsonCount(0, 'peers');
        $res = $this->poll($this->staff($shop, UserRole::MANAGER), $kitchen, ['name' => 'Kitchen', 'can_print' => true]);

        $res->assertOk()->assertJsonCount(1, 'peers');
        $res->assertJsonPath('peers.0.device_id', $bar);

        // and the first device now sees the second, with its printer flag
        $again = $this->poll($this->staff($shop), $bar);
        $again->assertJsonPath('peers.0.name', 'Kitchen')->assertJsonPath('peers.0.can_print', true);
    }

    public function test_devices_never_see_other_shops(): void
    {
        $a = $this->shop('Shop A');
        $b = $this->shop('Shop B');
        $this->poll($this->staff($a), (string) Str::uuid());
        $this->poll($this->staff($b), (string) Str::uuid())->assertJsonCount(0, 'peers');
    }

    public function test_setup_messages_reach_only_the_addressed_device_and_only_once(): void
    {
        $shop = $this->shop();
        $user = $this->staff($shop);
        $a = (string) Str::uuid();
        $b = (string) Str::uuid();
        $this->poll($user, $a);
        $this->poll($user, $b);

        $this->actingAs($user)->postJson('/devices/signal', [
            'device_id' => $a,
            'to' => $b,
            'type' => 'offer',
            'sid' => 'session-1',
            'payload' => ['type' => 'offer', 'sdp' => 'v=0...'],
        ])->assertNoContent();

        $this->poll($user, $a)->assertJsonCount(0, 'messages');

        $first = $this->poll($user, $b);
        $first->assertJsonCount(1, 'messages');
        $first->assertJsonPath('messages.0.from', $a);
        $first->assertJsonPath('messages.0.type', 'offer');
        $first->assertJsonPath('messages.0.sid', 'session-1');

        $this->poll($user, $b)->assertJsonCount(0, 'messages');
    }

    public function test_you_cannot_signal_a_device_in_another_shop(): void
    {
        $shopA = $this->shop('A');
        $shopB = $this->shop('B');
        $userA = $this->staff($shopA);
        $userB = $this->staff($shopB);
        $a = (string) Str::uuid();
        $b = (string) Str::uuid();
        $this->poll($userA, $a);
        $this->poll($userB, $b);

        $this->actingAs($userA)->postJson('/devices/signal', [
            'device_id' => $a,
            'to' => $b,
            'type' => 'ice',
            'sid' => 's',
            'payload' => ['candidate' => 'x'],
        ])->assertStatus(422)->assertJsonPath('error', 'unknown_peer');

        $this->poll($userB, $b)->assertJsonCount(0, 'messages');
    }

    public function test_signal_input_is_validated(): void
    {
        $shop = $this->shop();
        $user = $this->staff($shop);
        $a = (string) Str::uuid();
        $b = (string) Str::uuid();
        $this->poll($user, $a);
        $this->poll($user, $b);

        $base = ['device_id' => $a, 'to' => $b, 'type' => 'offer', 'sid' => 's', 'payload' => ['x' => 1]];

        $this->actingAs($user)->postJson('/devices/signal', array_merge($base, ['type' => 'shell']))
            ->assertStatus(422);
        $this->actingAs($user)->postJson('/devices/signal', array_merge($base, ['to' => $a]))
            ->assertStatus(422);
        $this->actingAs($user)->postJson('/devices/signal', array_merge($base, [
            'payload' => ['sdp' => str_repeat('x', 25000)],
        ]))->assertStatus(413);
    }

    public function test_leaving_removes_the_device_from_the_list(): void
    {
        $shop = $this->shop();
        $user = $this->staff($shop);
        $a = (string) Str::uuid();
        $b = (string) Str::uuid();
        $this->poll($user, $a);
        $this->poll($user, $b);

        $this->actingAs($user)->postJson('/devices/leave', ['device_id' => $b])->assertNoContent();

        $this->poll($user, $a)->assertJsonCount(0, 'peers');
    }

    public function test_a_device_that_stops_polling_drops_out_of_the_list(): void
    {
        $shop = $this->shop();
        $user = $this->staff($shop);
        $a = (string) Str::uuid();
        $b = (string) Str::uuid();
        $this->poll($user, $a);
        $this->poll($user, $b);

        // simulate b going quiet past the presence window
        Cache::forget("mesh:{$shop->id}:presence:{$b}");

        $this->poll($user, $a)->assertJsonCount(0, 'peers');
    }
}
