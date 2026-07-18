<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class StaffController extends Controller
{

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role' => 'required|in:manager,staff',
            'shop_id' => 'required|exists:shops,id',
            'pin' => 'required|digits:4', // Validate that it is exactly 4 digits
        ]);

        // Verify the authenticated user has access to this shop
        $accessibleShops = $request->user()->getAccessibleShopIds();

        if (!in_array($request->shop_id, $accessibleShops)) {
            abort(403, "You do not have permission to add staff to this shop.");
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role === 'manager' ? UserRole::MANAGER : UserRole::STAFF,
            'shop_id' => $request->shop_id,
            'pin' => $request->pin, // This will be automatically hashed by your model
        ]);

        return back()->with('success', 'Staff member created with PIN successfully.');
    }

    /**
     * Update existing staff details and PIN.
     */
    public function update(Request $request, User $user)
    {
        // 1. Authorization: Ensure the user being updated is in one of the owner/manager's shops
        if (!in_array($user->shop_id, $request->user()->getAccessibleShopIds())) {
            abort(403, "You do not have permission to modify this staff member.");
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'role' => 'sometimes|in:manager,staff',
            'pin' => 'sometimes|digits:4',
        ]);

        // If the owner changes the PIN, the model's setPinAttribute handles hashing automatically
        $user->update($validated);

        return back()->with('success', 'Staff member updated successfully.');
    }

    /**
     * Remove staff access immediately (Fire).
     */
    public function destroy(Request $request, User $user)
    {
        // 1. Authorization: Ensure the user being fired is in one of the owner/manager's shops
        if (!in_array($user->shop_id, $request->user()->getAccessibleShopIds())) {
            abort(403, "You do not have permission to delete this staff member.");
        }

        // 2. Perform deletion
        $user->delete();

        return back()->with('success', 'Staff access revoked successfully.');
    }
}
