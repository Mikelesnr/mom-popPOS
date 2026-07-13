<?php

use App\Http\Controllers\Inventory\FrontOfHouseMenuController;
use App\Http\Controllers\Inventory\CategoryController;
use App\Http\Controllers\Inventory\UnitController;
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

    // Sync endpoint for the PWA cache
    Route::get('/sync', [CategoryController::class, 'sync'])->name('sync');

    // CRUD routes for Categories
    Route::apiResource('categories', CategoryController::class);

    // CRUD routes for Units
    Route::apiResource('units', UnitController::class);
});