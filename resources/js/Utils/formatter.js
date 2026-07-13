/**
 * Formats a number as United States Dollar (USD) currency.
 * Example: 1250.50 -> $1,250.50
 *
 * @param {number|string} amount - The raw numerical value.
 * @returns {string} The formatted currency string.
 */
export const formatUsd = (amount) => {
    // Ensure the input is treated as a float
    const numericAmount = parseFloat(amount);

    // Return a fallback if the input isn't a valid number
    if (isNaN(numericAmount)) {
        return "$0.00";
    }

    // Create the formatter for USD (United States locale)
    const formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return formatter.format(numericAmount);
};
