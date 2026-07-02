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
    Route::post('/sync', [SyncOrdersController::class, 'syncOrders'])
        ->name('sync');
        
});