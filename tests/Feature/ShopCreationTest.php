<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShopCreationTest extends TestCase
{
    use RefreshDatabase;

    public function test_shop_can_be_created_within_zimbabwe(): void
    {
        $owner = User::factory()->owner()->create();

        // Harare
        $response = $this->actingAs($owner)->post('/shops', [
            'name' => 'Test Shop',
            'shop_type' => 'shop',
            'latitude' => -17.8292,
            'longitude' => 31.0522,
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('shops', ['name' => 'Test Shop']);
    }

    public function test_shop_creation_blocked_outside_zimbabwe(): void
    {
        $owner = User::factory()->owner()->create();

        // London
        $response = $this->actingAs($owner)->post('/shops', [
            'name' => 'Test Shop',
            'shop_type' => 'shop',
            'latitude' => 51.5072,
            'longitude' => -0.1276,
        ]);

        $response->assertSessionHasErrors('latitude');
        $this->assertDatabaseMissing('shops', ['name' => 'Test Shop']);
    }

    public function test_bar_shop_creates_shot_size_within_zimbabwe(): void
    {
        $owner = User::factory()->owner()->create();

        // Bulawayo
        $response = $this->actingAs($owner)->post('/shops', [
            'name' => 'Test Bar',
            'shop_type' => 'bar',
            'latitude' => -20.1500,
            'longitude' => 28.5833,
            'size_ml' => 25,
        ]);

        $response->assertSessionHasNoErrors();
        $shop = \App\Models\Shop::where('name', 'Test Bar')->firstOrFail();
        $this->assertDatabaseHas('shot_sizes', ['shop_id' => $shop->id, 'size_ml' => 25]);
    }
}
