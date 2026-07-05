<?php

use App\Http\Controllers\Inventory\FrontOfHouseMenuController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Mobile / Hardware Terminal Inventory Sub-Router
|--------------------------------------------------------------------------
*/
Route::prefix('terminal')->name('terminal.')->group(function () {
    
    // High-speed sync optimized for offline-first local storage states
    Route::get('/sync-catalog', [FrontOfHouseMenuController::class, 'syncCatalog'])
        ->name('catalog.sync');
        
});