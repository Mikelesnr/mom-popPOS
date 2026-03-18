<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::factory()->owner()->create([
            'name' => 'Shop Owner',
            'email' => 'owner@example.com',
        ]);

        User::factory()->admin()->create([
            'name' => 'System Admin',
            'email' => 'admin@example.com',
        ]);

        User::factory()->manager()->create([
            'name' => 'Manager One',
            'email' => 'manager1@example.com',
        ]);

        User::factory()->manager()->create([
            'name' => 'Manager Two',
            'email' => 'manager2@example.com',
        ]);

        User::factory()->cashier()->create(['email' => 'cashier1@example.com']);
        User::factory()->cashier()->create(['email' => 'cashier2@example.com']);
        User::factory()->cashier()->create(['email' => 'cashier3@example.com']);
    }
}
