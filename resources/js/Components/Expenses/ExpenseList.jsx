import React, { useState } from "react";
import { router } from "@inertiajs/react";
import { Trash2, Edit2 } from "lucide-react";
import { formatUsd } from "@/Utils/formatter";
import toast from "react-hot-toast";

export default function ExpenseList({ expenses, onEdit, onDeleteSuccess }) {
    const [deletingId, setDeletingId] = useState(null);

    // Sort expenses by created_at (newest first)[cite: 7]
    const sortedExpenses = [...expenses.data].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );

    const performDelete = () => {
        router.delete(route("expenses.destroy", deletingId), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Expense deleted successfully.");
                if (onDeleteSuccess) onDeleteSuccess(); // Refresh parent state[cite: 8]
                setDeletingId(null);
            },
            onError: () => {
                toast.error("Failed to delete the expense.");
                setDeletingId(null);
            },
        });
    };

    return (
        <div className="overflow-x-auto">
            {/* Confirmation Modal UI[cite: 11] */}
            {deletingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl">
                        <h3 className="text-lg font-bold">Confirm Deletion</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete this expense? This
                            action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeletingId(null)}
                                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={performDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <table className="hidden md:table min-w-full divide-y divide-gray-200">
                <thead>
                    <tr>
                        <th className="px-6 py-3 text-left">Description</th>
                        <th className="px-6 py-3 text-left">Created</th>
                        <th className="px-6 py-3 text-left">Updated</th>
                        <th className="px-6 py-3 text-right">Amount</th>
                        <th className="px-6 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {sortedExpenses.map((ex) => (
                        <tr key={ex.id}>
                            <td className="px-6 py-4">{ex.name}</td>
                            <td className="px-6 py-4 text-xs text-gray-500">
                                {new Date(ex.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500">
                                {new Date(ex.updated_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                                {formatUsd(ex.amount)}
                            </td>
                            <td className="px-6 py-4 flex gap-2 justify-end">
                                <button
                                    onClick={() => onEdit(ex)}
                                    className="text-blue-600"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => setDeletingId(ex.id)}
                                    className="text-red-600"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
