<?php

use App\Http\Controllers\Stock\StockController;
use App\Http\Controllers\Stock\WasteLogController;
use Illuminate\Support\Facades\Route;

Route::prefix('stock')->name('stock.')->group(function () {
    Route::post('/create-product', [StockController::class, 'store'])->name('create-product');

    Route::put('/update-product/{id}', [StockController::class, 'update'])
        ->name('update-product');

    Route::delete('/delete-product/{id}', [StockController::class, 'destroy'])
        ->name('delete-product');

    Route::put("/add-stock/", [StockController::class, 'bulkUpdateStock'])->name('add-stock');

    Route::post('/waste', [WasteLogController::class, 'store'])->name('waste.store');

    // 2. Add the new route for bulk reconciliation.
    // URL: /stock/count/reconcile
    // Name: stock.count.reconcile
    // Note: We use 'count' as a sub-prefix to keep the stock routes organized.
    Route::post('/count/reconcile', [StockController::class, 'reconcile'])
        ->name('count.reconcile');
});