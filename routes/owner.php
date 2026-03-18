<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ShopController;
use App\Http\Controllers\StaffController;

Route::middleware(['auth', 'verified'])->prefix('owner')->group(function () {
    // Owner dashboard
    Route::get('/dashboard', [\App\Http\Controllers\DashboardController::class, 'index'])
        ->name('owner.dashboard');

    // Shop management
    Route::get('/shops/create', [ShopController::class, 'create'])->name('owner.shops.create');
    Route::post('/shops', [ShopController::class, 'store'])->name('owner.shops.store');
    Route::delete('/shops/{shop}', [ShopController::class, 'destroy'])->name('owner.shops.destroy');

    // Staff management
    Route::post('/shops/{shop}/staff', [StaffController::class, 'createStaff'])->name('owner.staff.create');
    Route::delete('/shops/{shop}/staff/{user}', [StaffController::class, 'destroyStaff'])->name('owner.staff.destroy');
    Route::post('/shops/{fromShop}/move/{toShop}', [StaffController::class, 'moveStaff'])->name('owner.staff.move');
    Route::patch('/shops/{shop}/staff/{user}/role', [StaffController::class, 'updateRole'])->name('owner.staff.updateRole');
});
