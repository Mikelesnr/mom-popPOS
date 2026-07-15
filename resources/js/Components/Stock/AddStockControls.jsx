import React from "react";
import { Search, X } from "lucide-react";

export default function AddStockControls({
    categories,
    selectedCategory,
    onSelectCategory,
    searchTerm,
    onSearch,
}) {
    return (
        <div className="space-y-4">
            {/* Category Filter */}
            <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2.5 tracking-wider">
                    Filter by Category
                </h2>
                <div className="flex gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <button
                        onClick={() => onSelectCategory("all")}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                            selectedCategory === "all"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                        }`}
                    >
                        All Items
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => onSelectCategory(cat.slug)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                                selectedCategory === cat.slug
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Input */}
            <div className="relative">
                <Search
                    className="absolute left-3.5 top-3 text-gray-400"
                    size={20}
                />
                <input
                    type="text"
                    placeholder="Search products by name or SKU..."
                    value={searchTerm}
                    onChange={(e) => onSearch(e.target.value)}
                    className="w-full pl-11 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-300 focus:border-blue-400 transition-all text-sm bg-white"
                />
                {searchTerm && (
                    <button
                        onClick={() => onSearch("")}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>
        </div>
    );
}
