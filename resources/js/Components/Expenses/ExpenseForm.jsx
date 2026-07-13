import React, { useEffect } from "react";
import { useForm } from "@inertiajs/react";
import { X, Save, Loader2, DollarSign, Tag, FileText } from "lucide-react";
import toast from "react-hot-toast";

export default function ExpenseForm({
    isOpen,
    onClose,
    expenseTypes,
    expenseToEdit,
}) {
    // Initialize useForm with default empty values
    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            name: "",
            amount: "",
            type: "",
            notes: "",
        });

    // Populate form data when editingExpense changes
    useEffect(() => {
        if (expenseToEdit) {
            setData({
                name: expenseToEdit.name || "",
                amount: expenseToEdit.amount || "",
                type: expenseToEdit.type || "",
                notes: expenseToEdit.notes || "",
            });
            clearErrors();
        } else {
            reset();
        }
    }, [expenseToEdit]);

    const submit = (e) => {
        e.preventDefault();

        // --- THE FIX IS HERE ---
        // Determine whether to POST (Create) or PUT (Update)
        if (expenseToEdit) {
            // CORRECT: Use 'put' for updates
            put(route("expenses.update", expenseToEdit.id), {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Expense updated successfully");
                    onClose();
                },
                onError: () => toast.error("Failed to update expense."),
            });
        } else {
            // Create Mode
            post(route("expenses.store"), {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Expense logged successfully");
                    reset();
                    onClose();
                },
                onError: () => toast.error("Failed to log expense."),
            });
        }
    };

    if (!isOpen) return null;

    const isEditing = !!expenseToEdit;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative animate-in slide-in-from-bottom-4">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>

                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <DollarSign
                        className={`w-7 h-7 ${isEditing ? "text-blue-500" : "text-green-500"}`}
                    />
                    {isEditing
                        ? `Edit: ${expenseToEdit.name}`
                        : "Log New Expense"}
                </h3>

                <form onSubmit={submit} className="space-y-5">
                    {/* Name Field */}
                    <div>
                        <label
                            htmlFor="name"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Description
                        </label>
                        <div className="relative">
                            <Tag className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                            <input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) =>
                                    setData("name", e.target.value)
                                }
                                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-200 ${errors.name ? "border-red-300" : "border-gray-300"}`}
                                placeholder="e.g., Monthly Coffee Subscription"
                                required
                            />
                        </div>
                        {errors.name && (
                            <p className="text-red-600 text-xs mt-1">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    {/* Amount Field */}
                    <div>
                        <label
                            htmlFor="amount"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Amount (USD)
                        </label>
                        <div className="relative">
                            <DollarSign className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                            <input
                                id="amount"
                                type="number"
                                step="0.01"
                                value={data.amount}
                                onChange={(e) =>
                                    setData("amount", e.target.value)
                                }
                                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-200 ${errors.amount ? "border-red-300" : "border-gray-300"}`}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        {errors.amount && (
                            <p className="text-red-600 text-xs mt-1">
                                {errors.amount}
                            </p>
                        )}
                    </div>

                    {/* Type Field */}
                    <div>
                        <label
                            htmlFor="type"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Expense Type
                        </label>
                        <select
                            id="type"
                            value={data.type}
                            onChange={(e) => setData("type", e.target.value)}
                            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-200 capitalize ${errors.type ? "border-red-300" : "border-gray-300"}`}
                            required
                        >
                            <option value="">Select a type...</option>
                            {expenseTypes.map((type) => (
                                <option
                                    key={type}
                                    value={type}
                                    className="capitalize"
                                >
                                    {type}
                                </option>
                            ))}
                        </select>
                        {errors.type && (
                            <p className="text-red-600 text-xs mt-1">
                                {errors.type}
                            </p>
                        )}
                    </div>

                    {/* Notes Field */}
                    <div>
                        <label
                            htmlFor="notes"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Notes (Optional)
                        </label>
                        <div className="relative">
                            <FileText className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                            <textarea
                                id="notes"
                                value={data.notes}
                                onChange={(e) =>
                                    setData("notes", e.target.value)
                                }
                                rows="3"
                                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-200 ${errors.notes ? "border-red-300" : "border-gray-300"}`}
                                placeholder="Additional details..."
                            />
                        </div>
                        {errors.notes && (
                            <p className="text-red-600 text-xs mt-1">
                                {errors.notes}
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className={`px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors ${isEditing ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"} disabled:bg-gray-400`}
                        >
                            {processing ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            {processing
                                ? isEditing
                                    ? "Updating..."
                                    : "Saving..."
                                : isEditing
                                  ? "Update Expense"
                                  : "Save Expense"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
