<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    $user = auth()->user();

    return Inertia::render('Dashboard', [
        'auth' => [
            'user' => $user,
        ],
        'shopId' => $user->shop_id ?? null,
        'shops' => $user->shops ?? [], // optional if owner dashboards need it
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Register Inventory Sub-Router
    require __DIR__.'/inventory_pwa.php';

    // Register Sales Sub-Router
    require __DIR__.'/sales_pwa.php';
});

require __DIR__.'/auth.php';
