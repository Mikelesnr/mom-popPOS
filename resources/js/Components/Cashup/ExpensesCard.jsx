import React from "react";
import { money } from "./helpers";

export function ExpensesCard({ expenses, totalExpenses }) {
    return (
        <section className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
            <h2 className="font-bold text-stone-900 mb-3">Expenses</h2>
            {!expenses || expenses.length === 0 ? (
                <p className="text-sm text-stone-500">
                    No expenses logged this shift.
                </p>
            ) : (
                <>
                    <div className="space-y-2">
                        {expenses.map((expense) => (
                            <div
                                key={expense.id}
                                className="flex justify-between items-start gap-3 text-sm border-b border-stone-100 pb-2 last:border-0 last:pb-0"
                            >
                                <div className="min-w-0">
                                    <p className="font-medium text-stone-900">
                                        {expense.name}
                                    </p>
                                    <p className="text-xs text-stone-500 capitalize">
                                        {expense.type}
                                        {expense.notes
                                            ? ` · ${expense.notes}`
                                            : ""}
                                    </p>
                                </div>
                                <span className="font-mono font-semibold text-stone-900 shrink-0">
                                    {money(expense.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-stone-200 mt-3 pt-3 flex justify-between font-bold text-stone-900 text-sm">
                        <span>Total Expenses</span>
                        <span className="font-mono">
                            {money(totalExpenses)}
                        </span>
                    </div>
                </>
            )}
        </section>
    );
}
