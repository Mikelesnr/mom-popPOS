<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request (Standard PWA/Web Flow).
     */
    public function store(Request $request): RedirectResponse
    {
        // If shop_id is provided, this is a front-of-house staff member
        $isStaff = $request->filled('shop_id'); 

        $request->validate([
            'name' => 'required|string|max:255',
            // Management/Owners need emails; staff do not
            'email' => [
                $isStaff ? 'nullable' : 'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                'unique:' . User::class
            ],
            'password' => [$isStaff ? 'nullable' : 'required', 'confirmed', Rules\Password::defaults()],
            'role' => ['required', Rule::enum(UserRole::class)],
            'shop_id' => ['nullable', 'exists:shops,id'],
            // Staff MUST have a 4-digit login PIN if they don't have an email/password login
            'pin' => [$isStaff ? 'required' : 'nullable', 'string', 'size:4'],
        ]);

        $roleEnum = UserRole::from($request->role);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password ? Hash::make($request->password) : null,
            'role' => $roleEnum,
            // Double safeguard: owners or system staff never save a shop_id directly
            'shop_id' => $isStaff ? $request->shop_id : null,
            'pin' => $request->pin,
            // Bypass email verification friction entirely by marking it verified if an email exists
            'email_verified_at' => $request->email ? now() : null,
        ]);

        event(new Registered($user));

        // Auto-login if it's an initial Owner setup flow
        if ($roleEnum === UserRole::OWNER) {
            Auth::login($user);
            return redirect(route('dashboard', absolute: false));
        }

        // Return back cleanly if an owner/manager is provisioning staff accounts inside the dashboard
        return back()->with('success', 'Staff account provisioned successfully.');
    }

    /**
     * API Edge Sync / Terminal Provisioning Flow
     */
    public function storeApi(Request $request): JsonResponse
    {
        $isStaff = $request->filled('shop_id');

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => [$isStaff ? 'nullable' : 'required', 'string', 'lowercase', 'email', 'max:255', 'unique:' . User::class],
            'password' => [$isStaff ? 'nullable' : 'required', Rules\Password::defaults()],
            'role' => ['nullable', Rule::enum(UserRole::class)],
            'shop_id' => ['nullable', 'exists:shops,id'],
            'pin' => [$isStaff ? 'required' : 'nullable', 'string', 'size:4'],
        ]);

        $roleValue = $request->role ?? UserRole::CASHIER->value;
        $roleEnum = UserRole::from($roleValue);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password ? Hash::make($request->password) : null,
            'role' => $roleEnum,
            'shop_id' => $isStaff ? $request->shop_id : null,
            'pin' => $request->pin,
            'email_verified_at' => $request->email ? now() : null,
        ]);

        event(new Registered($user));

        $token = $user->createToken('pos-terminal-token')->plainTextToken;

        return response()->json([
            'user' => $user->makeHidden(['password', 'pin', 'remember_token']),
            'token' => $token,
        ], 201);
    }
}