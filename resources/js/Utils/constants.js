// Keep this in sync with App\Enums\ExpenseType
export const EXPENSE_TYPES = {
    FIXED: "fixed",
    SALARY: "salary",
    VARIABLE: "variable",
    STOCK: "stock",
};

// Helper to convert to label/value array for your CustomDropdown
export const EXPENSE_TYPE_OPTIONS = Object.entries(EXPENSE_TYPES).map(
    ([key, value]) => ({
        value: value,
        label: key.charAt(0).toUpperCase() + key.slice(1).toLowerCase(),
    }),
);
