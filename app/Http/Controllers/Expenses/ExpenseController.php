<?php

namespace App\Http\Controllers\Expenses;

use App\Enums\ExpenseType;
use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Shift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Enum;

class ExpenseController extends Controller
{
    /**
     * API endpoint for component-mounted expense lists.
     */
    public function getExpensesData(Request $request)
    {
        $expenses = Expense::whereHas('shift', function ($query) {
            $query->where('shop_id', Auth::user()->shop_id);
        })
            ->latest()
            ->paginate(15);

        return response()->json([
            'expenses' => $expenses,
            'expense_types' => ExpenseType::cases(),
        ]);
    }

    /**
     * Store a newly created resource.
     */
    public function store(Request $request)
    {
        $activeShift = Shift::where('shop_id', Auth::user()->shop_id)
            ->whereNull('closed_at')
            ->latest()
            ->firstOrFail();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'type' => ['required', 'string', new Enum(ExpenseType::class)],
            'notes' => 'nullable|string|max:1000',
        ]);

        Expense::create([
            'shift_id' => $activeShift->id,
            'user_id' => Auth::id(),
            'name' => $validated['name'],
            'amount' => $validated['amount'],
            'type' => $validated['type'],
            'notes' => $validated['notes'],
        ]);

        return redirect()->back()->with('success', 'Expense logged successfully.');
    }

    /**
     * Update the specified resource.
     */
    public function update(Request $request, Expense $expense)
    {
        // Verify the expense's shift belongs to the authenticated user's shop
        if ($expense->shift->shop_id !== Auth::user()->shop_id) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'type' => ['required', 'string', new Enum(ExpenseType::class)],
            'notes' => 'nullable|string|max:1000',
        ]);

        $expense->update($validated);

        return redirect()->back()->with('success', 'Expense updated successfully.');
    }

    /**
     * Remove the specified resource.
     */
    public function destroy(Expense $expense)
    {
        // Ensure the shift's shop_id matches the user's shop_id
        if ($expense->shift->shop_id !== Auth::user()->shop_id) {
            abort(403, 'Unauthorized access to delete this record.');
        }

        $expense->delete();

        return redirect()->back()->with('success', 'Expense deleted successfully.');
    }
}