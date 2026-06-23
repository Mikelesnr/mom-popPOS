<?php

// routes/auth_api.php

use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [RegisteredUserController::class, 'storeApi']);
Route::post('/login', [AuthenticatedSessionController::class, 'storeApi']);
