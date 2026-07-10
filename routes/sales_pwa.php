<?php

use App\Http\Controllers\Sales\SyncOrdersController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web/PWA Sales Sub-Router
|--------------------------------------------------------------------------
*/
Route::prefix('sales')->name('sales.')->group(function () {

    // Idempotent order synchronization endpoint
    Route::post('/sync-orders', [SyncOrdersController::class, 'syncOrders'])
        ->name('sync.orders');

    // Idempotent table synchronization endpoint
    Route::post('/sync-tables', [SyncOrdersController::class, 'syncTables'])
        ->name('sync.tables');
});
