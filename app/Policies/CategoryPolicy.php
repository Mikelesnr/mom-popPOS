<?php

namespace App\Policies;

use App\Models\Category;
use App\Models\User;
use Illuminate\Support\Facades\Gate;

/**
 * Who may rename, delete or change a category (including marking it as a
 * kitchen category): the owner of the shop, and its managers and shop managers.
 *
 * CategoryController calls authorize('update' | 'delete', $category). Until this
 * policy existed those calls had nothing to check against and were refused for
 * everyone.
 */
class CategoryPolicy
{
    public function update(User $user, Category $category): bool
    {
        return Gate::forUser($user)->allows('management', $category->shop_id);
    }

    public function delete(User $user, Category $category): bool
    {
        return Gate::forUser($user)->allows('management', $category->shop_id);
    }
}
