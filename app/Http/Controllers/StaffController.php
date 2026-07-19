<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;

class StaffController extends Controller
{
    /**
     * Roles the frontend can ever submit. Keep this in sync with
     * StaffCreateForm.jsx's availableRoles logic.
     */
    private const ASSIGNABLE_ROLES = [
        'owner',
        'shop_manager',
        'manager',
        'staff',
        'bartender',
        'waiter',
    ];

    /**
     * Which roles a given authenticated role is allowed to assign.
     * This mirrors StaffCreateForm.jsx's availableRoles, but enforced
     * server-side so the client can't just post an arbitrary role.
     */
    private function assignableRolesFor(string $authRole): array
    {
        return match ($authRole) {
            'owner' => ['owner', 'shop_manager', 'manager', 'staff', 'bartender', 'waiter'],
            'shop_manager' => ['manager', 'staff', 'bartender', 'waiter'],
            'manager' => ['staff', 'bartender', 'waiter'],
            default => [],
        };
    }

    /**
     * List staff for a given shop (or all accessible shops if none specified).
     */
    public function index(Request $request)
    {
        $accessibleShops = $request->user()->getAccessibleShopIds();

        $query = User::whereIn('shop_id', $accessibleShops);

        if ($request->filled('shop_id')) {
            if (!in_array($request->shop_id, $accessibleShops)) {
                abort(403, "You do not have permission to view staff for this shop.");
            }
            $query->where('shop_id', $request->shop_id);
        }

        $staff = $query->select('id', 'name', 'email', 'role', 'shop_id', 'created_at')
            ->orderBy('name')
            ->get();

        return response()->json($staff);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role' => ['required', Rule::in(self::ASSIGNABLE_ROLES)],
            'shop_id' => 'required|exists:shops,id',
            'pin' => 'required|digits:4',
        ]);

        $authUser = $request->user();

        // Verify the authenticated user has access to this shop
        $accessibleShops = $authUser->getAccessibleShopIds();
        if (!in_array($request->shop_id, $accessibleShops)) {
            abort(403, "You do not have permission to add staff to this shop.");
        }

        // Verify the authenticated user is actually allowed to assign this role.
        // Without this, anyone with shop access could POST role=owner directly,
        // bypassing the frontend's availableRoles restriction entirely.
        $allowedRoles = $this->assignableRolesFor($authUser->role->value ?? (string) $authUser->role);
        if (!in_array($request->role, $allowedRoles)) {
            abort(403, "You do not have permission to assign the '{$request->role}' role.");
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => UserRole::from($request->role),
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
            'role' => ['sometimes', Rule::in(self::ASSIGNABLE_ROLES)],
            'pin' => 'sometimes|digits:4',
        ]);

        // Same hierarchy check as store(): don't let a role change slip
        // past what the authenticated user is actually allowed to assign.
        if (isset($validated['role'])) {
            $authUser = $request->user();
            $allowedRoles = $this->assignableRolesFor($authUser->role->value ?? (string) $authUser->role);
            if (!in_array($validated['role'], $allowedRoles)) {
                abort(403, "You do not have permission to assign the '{$validated['role']}' role.");
            }
        }

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