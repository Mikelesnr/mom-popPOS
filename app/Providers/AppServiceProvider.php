<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use App\Models\User;
use App\Enums\UserRole;
use App\Services\InventoryConverter;
use App\Services\ShotCounter;
use App\Services\UnitProductCreator;
use App\Services\BottleProductCreator;
use App\Services\ProductUpdater;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Registered as a singleton for use in Sales, Metrics, and Stock
        $this->app->singleton(InventoryConverter::class, function ($app) {
            return new InventoryConverter();
        });

        $this->app->singleton(ShotCounter::class, function ($app) {
            return new ShotCounter($app->make(InventoryConverter::class));
        });

        $this->app->singleton(UnitProductCreator::class, function ($app) {
            return new UnitProductCreator();
        });

        $this->app->singleton(BottleProductCreator::class, function ($app) {
            return new BottleProductCreator();
        });

        $this->app->singleton(ProductUpdater::class, function ($app) {
            return new ProductUpdater();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        if (config('app.env') === 'production') {
            URL::forceScheme('https');
        }

        // =========================================================================
        // 1. SYSTEM-TIER SUPERIUS GATES (Global Infrastructure Platform Access)
        // =========================================================================

        // Absolute System Admin Gate (Michael's Master Controller Switch)
        Gate::define('system-admin', function (User $user) {
            return $user->role === UserRole::SYSTEM_ADMIN;
        });

        // System Operations Gate (For background maintenance/platform technicians)
        Gate::define('system-ops', function (User $user) {
            if ($user->role === UserRole::SYSTEM_ADMIN)
                return true;
            return in_array($user->role, [UserRole::SYSTEM_STAFF, UserRole::SYSTEM_TECHNICIAN]);
        });

        // Global Platform Accounting Gate (Future-proofed global audits)
        Gate::define('system-audit', function (User $user) {
            if ($user->role === UserRole::SYSTEM_ADMIN)
                return true;
            return $user->role === UserRole::SYSTEM_ACCOUNTANT;
        });


        // =========================================================================
        // 2. TENANT-TIER GATES (Store Level Data Enclaves)
        // =========================================================================

        // High-Level Business Logs Gate (Owners & Store Managers ONLY)
        // Controls: Gross Margin analysis, shop settings, and direct financial metrics
        Gate::define('view-shop-business-logs', function (User $user, string $shopId) {
            if ($user->role === UserRole::SYSTEM_ADMIN)
                return true;

            // Owners must own this specific storefront portfolio line
            if ($user->role === UserRole::OWNER) {
                return $user->ownedShops()->where('shops.id', $shopId)->exists();
            }

            // Shop Managers can view business logs only for their explicitly assigned home shop
            return $user->role === UserRole::SHOP_MANAGER && $user->shop_id === $shopId;
        });

        // Core Management Gate (Owners, Shop Managers, and Regular Managers)
        // Controls: Shift tracking updates, front-end cash-ups, and staff operations roster logs
        Gate::define('manage-shop-operations', function (User $user, string $shopId) {
            if ($user->role === UserRole::SYSTEM_ADMIN)
                return true;

            // Validations for owners mapping across portfolios
            if ($user->role === UserRole::OWNER) {
                return $user->ownedShops()->where('shops.id', $shopId)->exists();
            }

            // Broad check for store management levels assigned to this specific house context
            $allowedManagers = [
                UserRole::SHOP_MANAGER,
                UserRole::MANAGER
            ];

            return in_array($user->role, $allowedManagers) && $user->shop_id === $shopId;
        });

        // Frontline POS Execution Gate (Register staff session handling)
        // Controls: Opening transactions, registering line items, processing fluid volumetric metrics
        Gate::define('operate-pos', function (User $user, string $shopId) {
            if ($user->shop_id !== $shopId) {
                return false;
            }

            $allowedFrontline = [
                UserRole::CASHIER,
                UserRole::BARTENDER,
                UserRole::WAITER,
                UserRole::STAFF,
                UserRole::MANAGER,
                UserRole::SHOP_MANAGER
            ];

            return in_array($user->role, $allowedFrontline);
        });
    }
}
