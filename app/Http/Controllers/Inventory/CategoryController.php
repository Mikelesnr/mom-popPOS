<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

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
        return Category::where('shop_id', $request->user()->shop_id)->get();
    }

    /**
     * Store a new category scoped to the authenticated shop.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255'
        ]);

        return $request->user()->shop->categories()->create($validated);
    }

    /**
     * Update an existing category.
     */
    public function update(Request $request, Category $category)
    {
        $this->authorize('update', $category);

        $validated = $request->validate([
            'name' => 'required|string|max:255'
        ]);

        $category->update($validated);

        return $category;
    }

    /**
     * Remove a category.
     */
    public function destroy(Category $category)
    {
        $this->authorize('delete', $category);

        $category->delete();

        return response()->noContent();
    }
}