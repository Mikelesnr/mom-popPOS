<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Audit\AuditController;

Route::get('/audit/data', [AuditController::class, 'getAuditData'])->name('audit.data');