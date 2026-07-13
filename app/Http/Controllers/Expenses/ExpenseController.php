<?php

namespace App\Http\Controllers\Expenses;

use App\Enums\ExpenseType;
use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Enum;
use Inertia\Inertia;

class ExpenseController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // Get the current shop's ID
        $shopId = Auth::user()->shop_id;

        // Fetch expenses, paginated for performance, ordered by latest
        $expenses = Expense::where('shop_id', $shopId)
            ->latest()
            ->paginate(15);

        // Return the Inertia view, passing the expense data and the enum values
        return Inertia::render('Expenses/Index', [
            'expenses' => $expenses,
            'expense_types' => ExpenseType::cases(), // Passes [ {name, value}, ... ]
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // 1. Validate the request
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            // Validate that the input matches one of the Enum values
            'type' => ['required', 'string', new Enum(ExpenseType::class)],
            'notes' => 'nullable|string|max:1000',
        ]);

        // 2. Create the expense record
        try {
            Expense::create([
                'shop_id' => Auth::user()->shop_id, // Set tenant ID
                'name' => $validated['name'],
                'amount' => $validated['amount'],
                'type' => $validated['type'], // Eloquent handles the cast to Enum
                'notes' => $validated['notes'],
            ]);

            Log::info('Expense logged successfully by user: ' . Auth::id());

            // 3. Redirect back with success message
            return redirect()->back()->with('success', 'Expense logged successfully.');

        } catch (\Exception $e) {
            Log::error('Error logging expense: ' . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Failed to log expense. Please try again.']);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Expense $expense)
    {
        // 1. Authorization: Ensure the user owns this expense
        if ($expense->shop_id !== Auth::user()->shop_id) {
            abort(403, 'Unauthorized action.');
        }

        // 2. Validate the request
        // Validation rules are identical to 'store'
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'type' => ['required', 'string', new Enum(ExpenseType::class)],
            'notes' => 'nullable|string|max:1000',
        ]);

        // 3. Update the expense record
        try {
            $expense->update([
                'name' => $validated['name'],
                'amount' => $validated['amount'],
                'type' => $validated['type'],
                'notes' => $validated['notes'],
            ]);

            Log::info('Expense updated successfully by user: ' . Auth::id() . ' Expense ID: ' . $expense->id);

            // 4. Redirect back with success message
            return redirect()->back()->with('success', 'Expense updated successfully.');

        } catch (\Exception $e) {
            Log::error('Error updating expense: ' . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Failed to update expense. Please try again.']);
        }
    }

    /**
     * Remove the specified resource from storage.
     * (Optional: Include if you need deletion capability later)
     */
    public function destroy(Expense $expense)
    {
        // Ensure the user owns this expense via shop_id
        if ($expense->shop_id !== Auth::user()->shop_id) {
            abort(403);
        }

        $expense->delete();

        return redirect()->back()->with('success', 'Expense deleted successfully.');
    }
}