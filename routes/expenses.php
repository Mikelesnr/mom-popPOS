<?php

use App\Http\Controllers\Expenses\ExpenseController;
use Illuminate\Support\Facades\Route;

// Authorization enforced at the group level
Route::middleware('can:management')->prefix('expenses')->name('expenses.')->group(function () {
    // API endpoint for your mounted component
    Route::get('/data', [ExpenseController::class, 'getExpensesData'])->name('data');

    // CRUD operations
    Route::post('/', [ExpenseController::class, 'store'])->name('store');
    Route::put('/{expense}', [ExpenseController::class, 'update'])->name('update');
    Route::delete('/{expense}', [ExpenseController::class, 'destroy'])->name('destroy');
});