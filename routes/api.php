<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Import your custom auth routes
require __DIR__ . '/auth_api.php';

// Guarded Terminal Operations
Route::middleware('auth:sanctum')->group(function () {
    
    // IMPORT: Pull in terminal sync routing cleanly
    require __DIR__.'/inventory_api.php';
    
});