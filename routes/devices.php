<?php

use App\Http\Controllers\Devices\DeviceSignalController;
use Illuminate\Support\Facades\Route;

// Signaling for the shop device mesh (WebRTC). Authorization is here:
// only staff who may run a POS terminal for the shop they are assigned to can
// join that shop's mesh. Everything inside is scoped to their own shop_id.
Route::prefix('devices')
    ->name('devices.')
    ->middleware(['can:join-device-mesh', 'throttle:240,1'])
    ->group(function () {
        Route::post('/poll', [DeviceSignalController::class, 'poll'])->name('poll');
        Route::post('/signal', [DeviceSignalController::class, 'signal'])->name('signal');
        Route::post('/leave', [DeviceSignalController::class, 'leave'])->name('leave');
    });
