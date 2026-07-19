<?php

use App\Http\Controllers\StaffController;
use Illuminate\Support\Facades\Route;

// Only owners and managers can access these staff management routes
Route::middleware(['can:management'])->prefix('staff')->group(function () {
    Route::get('/', [StaffController::class, 'index'])->name('staff.index');
    Route::post('/', [StaffController::class, 'store'])->name('staff.store');
    Route::patch('/{user}', [StaffController::class, 'update'])->name('staff.update');
    Route::delete('/{user}', [StaffController::class, 'destroy'])->name('staff.destroy');
});