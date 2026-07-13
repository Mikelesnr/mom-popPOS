// resources/js/Pages/Expenses/Index.jsx
import React, { useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage } from "@inertiajs/react";
import ExpenseForm from "@/Components/Expenses/ExpenseForm";
import ExpenseList from "@/Components/Expenses/ExpenseList";
import { PlusCircle, Receipt } from "lucide-react";

export default function Index({ auth }) {
    const { expenses, expense_types } = usePage().props;

    // 1. State to control the modal's visibility
    const [isFormOpen, setIsFormOpen] = useState(false);
    // 2. State to hold the expense data being edited (null = Create Mode)
    const [editingExpense, setEditingExpense] = useState(null);

    // Handler to open the form for creating a new expense
    const openCreateModal = () => {
        setEditingExpense(null); // Ensure we are in Create Mode
        setIsFormOpen(true);
    };

    // 3. Handler to open the form for editing an existing expense
    const openEditModal = (expense) => {
        setEditingExpense(expense); // Pass the expense data to the form
        setIsFormOpen(true);
    };

    // Handler to close the modal and reset editing state
    const closeFormModal = () => {
        setIsFormOpen(false);
        setEditingExpense(null);
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight flex items-center gap-3">
                        <Receipt className="w-7 h-7 text-blue-600" />
                        Expense Management
                    </h2>
                    {/* Use the create handler */}
                    <button
                        onClick={openCreateModal}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <PlusCircle className="w-5 h-5" />
                        Log New Expense
                    </button>
                </div>
            }
        >
            <Head title="Expenses" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-2xl border border-gray-100">
                        <div className="p-6 text-gray-900">
                            {/* Pass the edit handler down to the list */}
                            <ExpenseList
                                expenses={expenses}
                                onEdit={openEditModal} // <--- NEW PROP
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Pass state and handlers down to the form */}
            <ExpenseForm
                isOpen={isFormOpen}
                onClose={closeFormModal} // <--- Updated
                expenseTypes={expense_types}
                expenseToEdit={editingExpense} // <--- NEW PROP
            />
        </AuthenticatedLayout>
    );
}
