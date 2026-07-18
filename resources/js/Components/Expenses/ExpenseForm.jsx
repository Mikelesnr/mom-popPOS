import React, { useEffect } from "react";
import { useForm } from "@inertiajs/react";
import { X, Save, Loader2, DollarSign, Tag, FileText } from "lucide-react";
import toast from "react-hot-toast";
import CustomDropdown from "@/Components/Shared/CustomDropdown";
import { EXPENSE_TYPE_OPTIONS } from "@/Utils/constants";

export default function ExpenseForm({ isOpen, onClose, expenseToEdit }) {
    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            name: "",
            amount: "",
            type: "",
            notes: "",
        });

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
            clearErrors();
        }
    }, [expenseToEdit, isOpen]);

    const submit = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(
                    expenseToEdit
                        ? "Expense updated"
                        : "Expense logged successfully",
                );
                onClose(true); // Trigger refresh
                reset();
            },
            onError: () => {
                toast.error("Please fix the errors in the form.");
            },
        };

        if (expenseToEdit) {
            put(route("expenses.update", expenseToEdit.id), options);
        } else {
            post(route("expenses.store"), options);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative animate-in slide-in-from-bottom-4">
                <button
                    onClick={() => onClose(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>

                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    {expenseToEdit ? "Edit Expense" : "Log New Expense"}
                </h3>

                <form onSubmit={submit} className="space-y-5">
                    {/* Name Field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <div className="relative">
                            <Tag className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                            <input
                                value={data.name}
                                onChange={(e) =>
                                    setData("name", e.target.value)
                                }
                                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg ${errors.name ? "border-red-300" : "border-gray-300"}`}
                                placeholder="e.g., Monthly Subscription"
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amount (USD)
                        </label>
                        <div className="relative">
                            <DollarSign className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                            <input
                                type="number"
                                step="0.01"
                                value={data.amount}
                                onChange={(e) =>
                                    setData("amount", e.target.value)
                                }
                                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg ${errors.amount ? "border-red-300" : "border-gray-300"}`}
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

                    {/* Type Field (CustomDropdown) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expense Type
                        </label>
                        <CustomDropdown
                            options={EXPENSE_TYPE_OPTIONS}
                            value={data.type}
                            onChange={(val) => setData("type", val)}
                            placeholder="Select expense type..."
                        />
                        {errors.type && (
                            <p className="text-red-600 text-xs mt-1">
                                {errors.type}
                            </p>
                        )}
                    </div>

                    {/* Notes Field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={data.notes}
                            onChange={(e) => setData("notes", e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg"
                            rows="3"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => onClose(false)}
                            className="px-5 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
                        >
                            {processing ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <Save size={20} />
                            )}
                            {processing ? "Saving..." : "Save Expense"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
