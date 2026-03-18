<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Enums\UserRole;
use App\Models\Shop;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        return match ($user->role) {
            UserRole::OWNER   => Inertia::render('Dashboard/Owner', [
                'auth' => ['user' => $user],
                'shops' => Shop::where('owner_id', $user->id)->get(),
            ]),
            UserRole::MANAGER => Inertia::render('Dashboard/Manger', ['auth' => ['user' => $user]]),
            UserRole::ADMIN   => Inertia::render('Dashboard/Admin', ['auth' => ['user' => $user]]),
            UserRole::CASHIER => Inertia::render('Dashboard/Cashier', ['auth' => ['user' => $user]]),
            default           => Inertia::render('Dashboard', ['auth' => ['user' => $user]]),
        };
    }
}
