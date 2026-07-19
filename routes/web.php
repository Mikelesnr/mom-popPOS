<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Expenses\ExpenseController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use App\Models\Shift;
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

    // Check if there is an open shift for this shop
    $currentShift = null;
    if ($user && $user->shop_id) {
        $currentShift = Shift::where('shop_id', $user->shop_id)
            ->whereNull('closed_at')
            ->latest('opened_at')
            ->first();
    }

    return Inertia::render('Dashboard', [
        'auth' => [
            'user' => $user,
        ],
        'shopId' => $user->shop_id ?? null,
        'shops' => $user->shopsOwned ?? [], // optional if owner dashboards need it
        'shift' => $currentShift ? [
            'id' => $currentShift->id,
            'opened_at' => $currentShift->opened_at,
            'closed_at' => $currentShift->closed_at,
            'user_id' => $currentShift->user_id,
        ] : null,
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');


Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');


    // Register Inventory Sub-Router
    require __DIR__ . '/inventory_pwa.php';

    // Register Sales Sub-Router
    require __DIR__ . '/sales_pwa.php';

    // Register stock subrouter
    require __DIR__ . '/stock.php';


    // Import Staff subrouter
    require __DIR__ . '/staff.php';

    //Import Shops subrouter
    require __DIR__ . '/shops.php';

    //Import espense sunrouter
    require __DIR__ . '/expenses.php';

    // Register Cashup Sub-Router
    require __DIR__ . '/cashup.php';

});

require __DIR__ . '/auth.php';
