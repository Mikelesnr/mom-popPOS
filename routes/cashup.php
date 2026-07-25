<?php
use App\Http\Controllers\Cashup\CashupController;
use Illuminate\Support\Facades\Route;

Route::prefix('cashup')->middleware('can:manage-shop-operations')->group(function () {
    Route::post('/{shiftId}/close', [CashupController::class, 'store'])->name('cashup.close');
    Route::get('/history/all', [CashupController::class, 'index'])->name('cashup.index');
    Route::get('/{shiftId}', [CashupController::class, 'show'])->name('cashup.show');
    Route::post('/table/{tableId}/close', [CashupController::class, 'closeTable'])->name('cashup.table.close');
});