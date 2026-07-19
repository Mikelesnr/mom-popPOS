<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    use AuthorizesRequests;

    /**
     * Master sync method to populate IndexedDB cache.
     */
    public function sync(Request $request)
    {
        return response()->json([
            'categories' => Category::where('shop_id', $request->user()->shop_id)->get(),
            'units' => Unit::all(),
        ]);
    }

    /**
     * List all categories for the authenticated shop.
     */
    public function index(Request $request)
    {
        return Category::where('shop_id', $request->user()->shop_id)
            ->orderBy('name')
            ->get();
    }

    /**
     * Store a new category scoped to the authenticated shop.
     *
     * Follows the offline-first pattern: the client generates the UUID
     * (and typically the slug) up front so it can write to Dexie
     * immediately and reconcile with the server afterward. If either
     * is omitted, we generate a sensible fallback here.
     */
    public function store(Request $request)
    {
        $shopId = $request->user()->shop_id;

        // Normalize casing up front, before validation, so "beers",
        // "BEERS", and "BeErS" are all treated as the same category
        // for the uniqueness check below.
        $request->merge([
            'name' => Str::title(trim((string) $request->input('name'))),
        ]);

        $validated = $request->validate([
            'id' => ['nullable', 'uuid'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('categories')->where(
                    fn($query) => $query->where('shop_id', $shopId),
                ),
            ],
            'slug' => ['nullable', 'string', 'max:255'],
        ], [
            'name.unique' => 'A category with this name already exists.',
        ]);

        // updateOrCreate on id: if the client retries a request that
        // actually succeeded (e.g. dropped response on a flaky connection),
        // this reconciles instead of throwing a duplicate-key error.
        $category = Category::updateOrCreate(
            ['id' => $validated['id'] ?? (string) Str::uuid()],
            [
                'shop_id' => $shopId,
                'name' => $validated['name'],
                'slug' => Str::slug($validated['name']),
            ],
        );

        return $category;
    }

    /**
     * Update an existing category.
     */
    public function update(Request $request, Category $category)
    {
        $this->authorize('update', $category);

        $request->merge([
            'name' => Str::title(trim((string) $request->input('name'))),
        ]);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('categories')
                    ->where(fn($query) => $query->where('shop_id', $category->shop_id))
                    ->ignore($category->id),
            ],
            'slug' => ['nullable', 'string', 'max:255'],
        ], [
            'name.unique' => 'A category with this name already exists.',
        ]);

        $category->update([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']),
        ]);

        return $category;
    }

    /**
     * Remove a category.
     */
    public function destroy(Category $category)
    {
        $this->authorize('delete', $category);

        // Prevent an FK constraint 500 — tell the user what's actually wrong.
        if (method_exists($category, 'products') && $category->products()->exists()) {
            return response()->json([
                'message' => 'This category still has products assigned to it. Move or remove those products first.',
            ], 409);
        }

        $category->delete();

        return response()->noContent();
    }
}