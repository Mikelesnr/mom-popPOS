<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\License\LicenseController;

// Called at login and periodically during sync - any authenticated terminal can check its own shop
Route::get('/license/status', [LicenseController::class, 'status'])->name('license.status');

// Toggle-from-the-form - lock this down to your admin role middleware,
// e.g. ->middleware('role:system_admin') using whatever gate you already use for staff hierarchy
Route::patch('/license/{shopId}', [LicenseController::class, 'update'])
    ->middleware('auth') // TODO: swap/add your system_admin check here
    ->name('license.update');