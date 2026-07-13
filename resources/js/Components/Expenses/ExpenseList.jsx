import React, { useState } from "react";
import { formatUsd } from "@/Utils/formatter";
import {
    ChevronRight,
    ChevronDown,
    Trash2,
    Edit2,
    CalendarDays,
    Tag,
    FileText,
} from "lucide-react";
import { router } from "@inertiajs/react"; // Assuming you use Inertia for delete

export default function ExpenseList({ expenses, onEdit }) {
    // State to track which expense row is currently expanded (by ID)
    const [expandedRow, setExpandedRow] = useState(null);

    const toggleRow = (expenseId) => {
        setExpandedRow(expandedRow === expenseId ? null : expenseId);
    };

    const handleEdit = (expense) => {
        onEdit(expense);
        setExpandedRow(null);
        console.log("Editing", expense);
    };

    const handleDelete = (expense) => {
        if (confirm("Are you sure you want to delete this expense?")) {
            router.delete(route("expenses.destroy", expense.id), {
                preserveScroll: true,
            });
        }
    };

    const thClasses =
        "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
    const tdClasses = "px-6 py-4 whitespace-nowrap text-sm text-gray-900";

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead>
                    <tr>
                        <th scope="col" className="w-10 px-6 py-3"></th>
                        <th scope="col" className={thClasses}>
                            Date
                        </th>
                        <th scope="col" className={thClasses}>
                            Description
                        </th>
                        <th scope="col" className={thClasses}>
                            Type
                        </th>
                        <th scope="col" className={`${thClasses} text-right`}>
                            Amount
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {expenses.data.length === 0 ? (
                        <tr>
                            <td
                                colSpan="5"
                                className="text-center py-10 text-gray-500"
                            >
                                No expenses logged yet.
                            </td>
                        </tr>
                    ) : (
                        expenses.data.map((expense) => (
                            <React.Fragment key={expense.id}>
                                {/* Main Summary Row */}
                                <tr
                                    onClick={() => toggleRow(expense.id)}
                                    className={`cursor-pointer transition-colors ${
                                        expandedRow === expense.id
                                            ? "bg-blue-50 hover:bg-blue-100"
                                            : "hover:bg-gray-50"
                                    }`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {expandedRow === expense.id ? (
                                            <ChevronDown className="w-5 h-5 text-blue-600" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                        )}
                                    </td>
                                    <td className={tdClasses}>
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4 text-gray-400" />
                                            {new Date(
                                                expense.created_at,
                                            ).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td
                                        className={`${tdClasses} font-medium text-gray-900`}
                                    >
                                        {expense.name}
                                    </td>
                                    <td className={tdClasses}>
                                        <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 capitalize items-center gap-1">
                                            <Tag className="w-3 h-3" />
                                            {expense.type}
                                        </span>
                                    </td>
                                    <td
                                        className={`${tdClasses} text-right font-bold text-green-600 text-base`}
                                    >
                                        {formatUsd(expense.amount)}
                                    </td>
                                </tr>

                                {/* Inline Expanded Details Row (Renders ExpenseDetails.jsx content) */}
                                {expandedRow === expense.id && (
                                    <tr className="bg-blue-50/50 border-b-2 border-blue-100 animate-in fade-in duration-300">
                                        <td colSpan="5" className="px-6 py-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-gray-200 shadow-inner">
                                                {/* Left Column: Details */}
                                                <div className="space-y-4">
                                                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">
                                                        Full Details
                                                    </h4>

                                                    <DetailItem
                                                        label="Expense ID"
                                                        value={expense.id}
                                                        isUuid
                                                    />
                                                    <DetailItem
                                                        label="Description"
                                                        value={expense.name}
                                                        icon={Tag}
                                                    />
                                                    <DetailItem
                                                        label="Amount"
                                                        value={formatUsd(
                                                            expense.amount,
                                                        )}
                                                        className="text-green-600 font-bold"
                                                    />
                                                    <DetailItem
                                                        label="Type"
                                                        value={expense.type}
                                                        className="capitalize"
                                                    />
                                                    <DetailItem
                                                        label="Date Logged"
                                                        value={new Date(
                                                            expense.created_at,
                                                        ).toLocaleString()}
                                                        icon={CalendarDays}
                                                    />
                                                </div>

                                                {/* Right Column: Notes & Actions */}
                                                <div className="flex flex-col justify-between gap-6">
                                                    <div className="space-y-4">
                                                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">
                                                            Notes
                                                        </h4>
                                                        <div className="bg-gray-50 p-4 rounded-lg border min-h-[100px] text-gray-700 text-sm flex gap-3">
                                                            <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                                            {expense.notes || (
                                                                <span className="italic text-gray-400">
                                                                    No notes
                                                                    provided.
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                                                        <button
                                                            onClick={() =>
                                                                handleEdit(
                                                                    expense,
                                                                )
                                                            }
                                                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                            Edit Details
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleDelete(
                                                                    expense,
                                                                )
                                                            }
                                                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))
                    )}
                </tbody>
            </table>

            {/* Pagination (if needed, retain from previous version) */}
            {expenses.meta && (
                <div className="py-4 px-6 border-t bg-gray-50">
                    {/* Pagination links go here */}
                </div>
            )}
        </div>
    );
}

// Helper component for rendering individual detail items cleanly
// This replaces needing a separate ExpenseDetails.jsx file by defining the view here
const DetailItem = ({
    label,
    value,
    icon: Icon,
    isUuid = false,
    className = "",
}) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-xs text-gray-500">{label}</span>
        <div
            className={`flex items-center gap-2 text-sm text-gray-900 ${className}`}
        >
            {Icon && <Icon className="w-4 h-4 text-gray-400" />}
            {isUuid ? (
                <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded select-all">
                    {value}
                </span>
            ) : (
                <span>{value}</span>
            )}
        </div>
    </div>
);
