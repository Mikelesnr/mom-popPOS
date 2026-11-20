<?php

use App\Http\Controllers\ShopController;
use Illuminate\Support\Facades\Route;

Route::prefix('shops')->group(function () {
    Route::post('/', [ShopController::class, 'store'])->name('shops.store');
    Route::patch('/{shop}', [ShopController::class, 'update'])->name('shops.update');
    Route::patch('/{shop}/print-settings', [ShopController::class, 'updatePrintSettings'])
        ->middleware('can:manage-shop-print-settings,shop')
        ->name('shops.print-settings');
    Route::get('/', [ShopController::class, 'getOwnerPortfolio'])->name('get.shops');
});