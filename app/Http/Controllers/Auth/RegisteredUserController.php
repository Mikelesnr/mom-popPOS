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
    public function store(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:' . User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Create the new user with 'owner' role
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'owner',
        ]);

        // Fire the registered event
        event(new Registered($user));

        // Log the user in immediately
        Auth::login($user);

        // Redirect to the dashboard
        return redirect(route('dashboard', absolute: false));
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