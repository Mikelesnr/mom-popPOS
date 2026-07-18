import React, { useState, useEffect } from "react";
import axios from "axios";
import ExpenseForm from "@/Components/Expenses/ExpenseForm";
import ExpenseList from "@/Components/Expenses/ExpenseList";
import { PlusCircle, Receipt, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ExpenseManager() {
    // 1. Local state for data and UI
    const [expenses, setExpenses] = useState({ data: [] });
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    // 2. Data fetching logic
    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(route("expenses.data"));
            // Ensure we handle the paginated response structure
            setExpenses(response.data.expenses);
        } catch (error) {
            toast.error("Failed to load expenses.");
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 3. UI Handlers
    const openCreateModal = () => {
        setEditingExpense(null);
        setIsFormOpen(true);
    };

    const openEditModal = (expense) => {
        setEditingExpense(expense);
        setIsFormOpen(true);
    };

    const closeFormModal = (refresh = false) => {
        setIsFormOpen(false);
        setEditingExpense(null);
        if (refresh) fetchData();
    };

    // 4. Loading State
    if (loading) {
        return (
            <div className="p-10 flex justify-center">
                <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
            </div>
        );
    }

    // 5. Render
    return (
        <div className="bg-white overflow-hidden shadow-sm sm:rounded-2xl border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-3">
                    <Receipt className="w-6 h-6 text-blue-600" />
                    Expense Management
                </h2>
                <button
                    onClick={openCreateModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <PlusCircle className="w-5 h-5" />
                    Log New Expense
                </button>
            </div>

            <ExpenseList
                expenses={expenses}
                onEdit={openEditModal}
                onDeleteSuccess={fetchData} // Add this prop
            />

            <ExpenseForm
                isOpen={isFormOpen}
                onClose={closeFormModal}
                expenseToEdit={editingExpense}
            />
        </div>
    );
}
