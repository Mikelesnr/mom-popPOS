<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Shop;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // 1. First, seed your secure administrator record from the local configuration environment
        if (config('services.admin.email')) {
            User::updateOrCreate(
                ['email' => config('services.admin.email')],
                [
                    'id' => (string) Str::uuid(), // Generates a runtime UUID anchor for your admin
                    'shop_id' => null,            // App admins sit completely above single shops
                    'name' => config('services.admin.name'),
                    'password' => Hash::make(config('services.admin.password')),
                    'role' => 'admin',
                    'pin' => config('services.admin.pin'),
                ]
            );
        }

        // 2. Load and seed your standard mock testing users from the JSON file
        $json = File::get(database_path('data/users.json'));
        $users = json_decode($json, true);
        
        $firstShop = Shop::first();

        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                [
                    'id' => $user['id'],
                    'shop_id' => $firstShop?->id ?? null,
                    'name' => $user['name'],
                    'password' => Hash::make($user['password']),
                    'role' => $user['role'],
                    'pin' => $user['pin'],
                ]
            );
        }
    }
}