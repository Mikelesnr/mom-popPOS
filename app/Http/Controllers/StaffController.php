<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Shop;
use App\Enums\UserRole;

class StaffController extends Controller
{
    /**
     * Create a manager or cashier and attach to a shop
     */
    public function createStaff(Request $request, Shop $shop)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|in:manager,cashier',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => bcrypt($request->password),
            'role' => $request->role === 'manager' ? UserRole::MANAGER : UserRole::CASHIER,
        ]);

        // Use the staff() relationship instead of users()
        $shop->staff()->attach($user->id);

        return back()->with('success', ucfirst($request->role) . ' created and attached to shop!');
    }

    /**
     * Fire staff (detach and delete user)
     */
    public function destroyStaff(Shop $shop, User $user)
    {
        $shop->staff()->detach($user->id);
        $user->delete();

        return back()->with('success', 'Staff member fired successfully!');
    }

    /**
     * Move staff between shops
     */
    public function moveStaff(Request $request, Shop $fromShop, Shop $toShop)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $userId = $request->user_id;

        $fromShop->staff()->detach($userId);
        $toShop->staff()->syncWithoutDetaching([$userId]);

        return back()->with('success', 'Staff moved successfully!');
    }

    /**
     * Update a staff member's role (manager ↔ cashier)
     */
    public function updateRole(Request $request, Shop $shop, User $user)
    {
        $request->validate([
            'role' => 'required|in:manager,cashier',
        ]);

        // Ensure the user actually belongs to this shop
        if (!$shop->staff()->where('user_id', $user->id)->exists()) {
            return back()->withErrors(['user' => 'This staff member does not belong to the selected shop']);
        }

        // Update role
        $user->role = $request->role === 'manager' ? UserRole::MANAGER : UserRole::CASHIER;
        $user->save();

        return back()->with('success', 'Staff role updated successfully!');
    }
}
