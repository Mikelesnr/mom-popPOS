<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Shift;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request (Standard PWA/Web Flow).
     */
    public function store(Request $request): RedirectResponse
    {
        // 1. Determine if this is a high-speed Front-of-House PIN login
        if ($request->filled('pin') && $request->filled('shop_id')) {
            $request->validate([
                'shop_id' => ['required', 'exists:shops,id'],
                'pin' => ['required', 'string', 'size:4'],
            ]);

            // Retrieve all users attached to this storefront
            $users = User::where('shop_id', $request->shop_id)->get();
            $authenticatedUser = null;

            // Loop through and verify against the bcrypt hashed PINs
            foreach ($users as $user) {
                if ($user->pin && Hash::check($request->pin, $user->pin)) {
                    $authenticatedUser = $user;
                    break;
                }
            }

            if (! $authenticatedUser) {
                throw ValidationException::withMessages([
                    'pin' => ['Invalid PIN code for this shop storefront.'],
                ]);
            }

            // FIX: Force 'true' for remember state on terminal logins so the session cookie 
            // doesn't immediately drop on the subsequent Inertia redirect.
            Auth::login($authenticatedUser, true);
            $request->session()->regenerate();

            // --- AUTO SHIFT CREATION ---
            $shopId = $authenticatedUser->shop_id;
            $currentShift = Shift::where('shop_id', $shopId)
                ->whereNull('closed_at')
                ->first();

            if (! $currentShift) {
                $currentShift = Shift::create([
                    'shop_id' => $shopId,
                    'user_id' => $authenticatedUser->id,
                    'opened_at' => now(),
                ]);
            }

            // Attach shift_id to session for quick access
            session(['shift_id' => $currentShift->id]);

            return redirect()->intended(route('dashboard', absolute: false));
        }

        // 2. Fall back to standard Email/Password authentication for Admins/Owners
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! $user->password || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        // Safe fallback: Default to true if specified, or if session dropping bugs persist on this environment
        $remember = $request->has('remember') ? $request->boolean('remember') : true;

        Auth::login($user, $remember);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Handle an incoming API verification request (Edge Sync / Terminal Provisioning).
     * KEPT INTACT FOR REACT NATIVE APP
     */
    public function storeApi(Request $request): JsonResponse
    {
        $request->validate([
            'device_name' => ['required', 'string'],
        ]);

        // 1. Handle API authentication via Front-of-house PIN pad code execution
        if ($request->filled('pin') && $request->filled('shop_id')) {
            $request->validate([
                'shop_id' => ['required', 'exists:shops,id'],
                'pin' => ['required', 'string', 'size:4'],
            ]);

            // Retrieve all users attached to this storefront
            $users = User::where('shop_id', $request->shop_id)->get();
            $authenticatedUser = null;

            // Loop through and verify against the bcrypt hashed PINs
            foreach ($users as $user) {
                if ($user->pin && Hash::check($request->pin, $user->pin)) {
                    $authenticatedUser = $user;
                    break;
                }
            }

            if (! $authenticatedUser) {
                return response()->json(['message' => 'Invalid terminal PIN assignment.'], 401);
            }

            // --- AUTO SHIFT CREATION ---
            $shopId = $authenticatedUser->shop_id;
            $currentShift = Shift::where('shop_id', $shopId)
                ->whereNull('closed_at')
                ->first();

            if (! $currentShift) {
                $currentShift = Shift::create([
                    'shop_id' => $shopId,
                    'user_id' => $authenticatedUser->id,
                    'opened_at' => now(),
                ]);
            }

            $token = $authenticatedUser->createToken($request->device_name)->plainTextToken;

            return response()->json([
                'user' => $authenticatedUser->makeHidden(['password', 'pin', 'remember_token']),
                'token' => $token,
                'shift_id' => $currentShift->id,
            ]);
        }

        // 2. Handle typical Administrative/Owner login fallback for API sync pipelines
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! $user->password || ! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => __('auth.failed')], 401);
        }

        $token = $user->createToken($request->device_name)->plainTextToken;

        return response()->json([
            'user' => $user->makeHidden(['password', 'pin', 'remember_token']),
            'token' => $token,
        ]);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
