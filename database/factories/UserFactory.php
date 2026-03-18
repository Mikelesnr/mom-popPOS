<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Enums\UserRole;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => Hash::make('Test1234#'),
            'remember_token' => Str::random(10),
            'role' => UserRole::CASHIER, // default role
        ];
    }

    public function owner(): static
    {
        return $this->state(fn() => ['role' => UserRole::OWNER]);
    }

    public function admin(): static
    {
        return $this->state(fn() => ['role' => UserRole::ADMIN]);
    }

    public function manager(): static
    {
        return $this->state(fn() => ['role' => UserRole::MANAGER]);
    }

    public function cashier(): static
    {
        return $this->state(fn() => ['role' => UserRole::CASHIER]);
    }
}
