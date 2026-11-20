<?php

namespace Tests\Feature;

use App\Enums\ShopType;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Tests\TestCase;

class KitchenAndPrintSettingsTest extends TestCase
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

    private function staff(Shop $shop, UserRole $role): User
    {
        return User::factory()->create(['shop_id' => $shop->id, 'role' => $role]);
    }

    // ------------------------------------------------------------ categories

    public function test_a_category_can_be_created_as_a_kitchen_category(): void
    {
        $shop = $this->shop();
        $manager = $this->staff($shop, UserRole::MANAGER);

        $this->actingAs($manager)
            ->postJson(route('inventory.categories.store'), ['name' => 'Grill', 'is_kitchen' => true])
            ->assertOk()
            ->assertJsonPath('is_kitchen', true);

        $this->assertTrue(Category::where('name', 'Grill')->firstOrFail()->is_kitchen);
    }

    public function test_a_category_is_not_a_kitchen_category_unless_asked(): void
    {
        $shop = $this->shop();
        $this->actingAs($this->staff($shop, UserRole::MANAGER))
            ->postJson(route('inventory.categories.store'), ['name' => 'Beers'])
            ->assertOk()
            ->assertJsonPath('is_kitchen', false);
    }

    public function test_a_manager_can_switch_a_category_to_and_from_the_kitchen(): void
    {
        $shop = $this->shop();
        $manager = $this->staff($shop, UserRole::SHOP_MANAGER);
        $category = Category::create(['shop_id' => $shop->id, 'name' => 'Grill', 'slug' => 'grill']);

        $this->actingAs($manager)
            ->putJson(route('inventory.categories.update', $category), ['name' => 'Grill', 'is_kitchen' => true])
            ->assertOk()
            ->assertJsonPath('is_kitchen', true);

        $this->actingAs($manager)
            ->putJson(route('inventory.categories.update', $category), ['name' => 'Grill', 'is_kitchen' => false])
            ->assertOk()
            ->assertJsonPath('is_kitchen', false);
    }

    public function test_renaming_a_category_keeps_its_kitchen_flag(): void
    {
        $shop = $this->shop();
        $category = Category::create(['shop_id' => $shop->id, 'name' => 'Grill', 'slug' => 'grill', 'is_kitchen' => true]);

        $this->actingAs($this->staff($shop, UserRole::MANAGER))
            ->putJson(route('inventory.categories.update', $category), ['name' => 'Braai'])
            ->assertOk()
            ->assertJsonPath('is_kitchen', true);
    }

    public function test_cashiers_and_other_shops_cannot_change_a_category(): void
    {
        $shop = $this->shop('A');
        $other = $this->shop('B');
        $category = Category::create(['shop_id' => $shop->id, 'name' => 'Grill', 'slug' => 'grill']);

        $this->actingAs($this->staff($shop, UserRole::CASHIER))
            ->putJson(route('inventory.categories.update', $category), ['name' => 'Grill', 'is_kitchen' => true])
            ->assertForbidden();

        $this->actingAs($this->staff($other, UserRole::MANAGER))
            ->putJson(route('inventory.categories.update', $category), ['name' => 'Grill', 'is_kitchen' => true])
            ->assertForbidden();

        $this->assertFalse($category->fresh()->is_kitchen);
    }

    public function test_the_catalog_sync_tells_the_till_which_categories_are_kitchen(): void
    {
        $shop = $this->shop();
        Category::create(['shop_id' => $shop->id, 'name' => 'Grill', 'slug' => 'grill', 'is_kitchen' => true]);
        Category::create(['shop_id' => $shop->id, 'name' => 'Beers', 'slug' => 'beers']);

        $menu = $this->actingAs($this->staff($shop, UserRole::CASHIER))
            ->getJson('/inventory/sync-catalog')
            ->assertOk()
            ->json('menu');

        $byName = collect($menu)->keyBy('name');
        $this->assertTrue($byName['Grill']['is_kitchen']);
        $this->assertFalse($byName['Beers']['is_kitchen']);
    }

    // ---------------------------------------------------- print settings

    public function test_receipts_do_not_print_automatically_until_a_manager_turns_it_on(): void
    {
        $this->assertFalse($this->shop()->fresh()->auto_print_receipts);
    }

    public function test_managers_shop_managers_and_the_owner_can_change_the_setting(): void
    {
        $shop = $this->shop();
        $owner = User::factory()->owner()->create();
        $shop->owners()->attach($owner->id);

        foreach ([$this->staff($shop, UserRole::MANAGER), $this->staff($shop, UserRole::SHOP_MANAGER), $owner] as $user) {
            $this->actingAs($user)
                ->patchJson(route('shops.print-settings', $shop), ['auto_print_receipts' => true])
                ->assertOk()
                ->assertJsonPath('auto_print_receipts', true);
            $this->assertTrue($shop->fresh()->auto_print_receipts);

            $this->actingAs($user)
                ->patchJson(route('shops.print-settings', $shop), ['auto_print_receipts' => false])
                ->assertOk()
                ->assertJsonPath('auto_print_receipts', false);
        }
    }

    public function test_cashiers_and_other_shops_cannot_change_the_setting(): void
    {
        $shop = $this->shop('A');
        $other = $this->shop('B');

        foreach ([$this->staff($shop, UserRole::CASHIER), $this->staff($other, UserRole::MANAGER)] as $user) {
            $this->actingAs($user)
                ->patchJson(route('shops.print-settings', $shop), ['auto_print_receipts' => true])
                ->assertForbidden();
        }
        $this->assertFalse($shop->fresh()->auto_print_receipts);
    }

    public function test_the_setting_must_be_a_boolean(): void
    {
        $shop = $this->shop();
        $this->actingAs($this->staff($shop, UserRole::MANAGER))
            ->patchJson(route('shops.print-settings', $shop), ['auto_print_receipts' => 'maybe'])
            ->assertStatus(422);
        $this->actingAs($this->staff($shop, UserRole::MANAGER))
            ->patchJson(route('shops.print-settings', $shop), [])
            ->assertStatus(422);
    }

    // ------------------------------------------- reaching the devices

    private function poll(User $user, string $deviceId, array $extra = [])
    {
        return $this->actingAs($user)->postJson('/devices/poll', array_merge([
            'device_id' => $deviceId,
            'name' => 'Bar',
        ], $extra));
    }

    public function test_devices_get_the_shop_settings_with_every_poll(): void
    {
        $shop = $this->shop();
        $grill = Category::create(['shop_id' => $shop->id, 'name' => 'Grill', 'slug' => 'grill', 'is_kitchen' => true]);
        Category::create(['shop_id' => $shop->id, 'name' => 'Beers', 'slug' => 'beers']);

        $res = $this->poll($this->staff($shop, UserRole::CASHIER), (string) Str::uuid())->assertOk();

        $res->assertJsonPath('shop_settings.auto_print_receipts', false);
        $this->assertSame([$grill->id], $res->json('shop_settings.kitchen_category_ids'));
    }

    public function test_a_change_reaches_devices_on_their_next_poll_even_though_polls_are_cached(): void
    {
        $shop = $this->shop();
        $manager = $this->staff($shop, UserRole::MANAGER);
        $device = (string) Str::uuid();

        $this->poll($manager, $device)->assertJsonPath('shop_settings.auto_print_receipts', false);

        $this->actingAs($manager)
            ->patchJson(route('shops.print-settings', $shop), ['auto_print_receipts' => true])
            ->assertOk();
        $this->poll($manager, $device)->assertJsonPath('shop_settings.auto_print_receipts', true);

        $category = Category::create(['shop_id' => $shop->id, 'name' => 'Grill', 'slug' => 'grill']);
        $this->actingAs($manager)
            ->putJson(route('inventory.categories.update', $category), ['name' => 'Grill', 'is_kitchen' => true])
            ->assertOk();
        $this->assertSame([$category->id], $this->poll($manager, $device)->json('shop_settings.kitchen_category_ids'));
    }

    public function test_one_shops_settings_never_reach_another_shop(): void
    {
        $a = $this->shop('A');
        $b = $this->shop('B');
        Category::create(['shop_id' => $a->id, 'name' => 'Grill', 'slug' => 'grill', 'is_kitchen' => true]);
        $a->update(['auto_print_receipts' => true]);
        Cache::flush();

        $res = $this->poll($this->staff($b, UserRole::CASHIER), (string) Str::uuid())->assertOk();
        $res->assertJsonPath('shop_settings.auto_print_receipts', false);
        $this->assertSame([], $res->json('shop_settings.kitchen_category_ids'));
    }

    public function test_the_kitchen_device_is_flagged_for_the_other_devices(): void
    {
        $shop = $this->shop();
        $kitchen = (string) Str::uuid();
        $bar = (string) Str::uuid();

        $this->poll($this->staff($shop, UserRole::CASHIER), $kitchen, ['name' => 'Kitchen', 'is_kitchen' => true]);
        $res = $this->poll($this->staff($shop, UserRole::CASHIER), $bar);

        $res->assertJsonPath('peers.0.device_id', $kitchen)->assertJsonPath('peers.0.is_kitchen', true);
    }
}
