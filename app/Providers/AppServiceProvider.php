<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use App\Enums\UserRole;
use Illuminate\Support\Facades\Gate;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Frontend asset prefetch
        Vite::prefetch(concurrency: 3);

        // Gates for role-based permissions
        Gate::define(
            'manage-high-level-users',
            fn($user) =>
            $user->role === UserRole::OWNER
        );

        Gate::define(
            'cashup',
            fn($user) =>
            in_array($user->role, [UserRole::OWNER, UserRole::MANAGER])
        );

        Gate::define(
            'view-metrics',
            fn($user) =>
            in_array($user->role, [UserRole::OWNER, UserRole::MANAGER])
        );

        Gate::define(
            'system-settings',
            fn($user) =>
            $user->role === UserRole::ADMIN
        );

        Gate::define(
            'make-sale',
            fn($user) =>
            $user->role === UserRole::CASHIER
        );
    }
}
