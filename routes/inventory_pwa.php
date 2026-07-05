<?php

use App\Http\Controllers\Inventory\FrontOfHouseMenuController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web/PWA Inventory Sub-Router
|--------------------------------------------------------------------------
*/
Route::prefix('inventory')->name('inventory.')->group(function () {
    
    // One solid download endpoint to populate the IndexedDB cache layer
    Route::get('/sync-catalog', [FrontOfHouseMenuController::class, 'syncCatalog'])
        ->name('catalog.sync');
        
});