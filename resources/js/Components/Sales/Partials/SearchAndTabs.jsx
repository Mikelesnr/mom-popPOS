import React from "react";
import { Category } from "@/Utils/contracts.js";
import CustomDropdown from "@/Components/Shared/CustomDropdown";

/**
 * @param {Object} props
 * @param {Category[]} props.categories
 * @param {string|null} props.activeCategory
 * @param {Function} props.setActiveCategory
 * @param {string[]} props.colorPalette
 * @param {Function} props.refreshCatalog
 * @param {boolean} props.isSyncing
 */
export default function SearchAndTabs({
    categories,
    activeCategory,
    setActiveCategory,
    colorPalette,
    refreshCatalog,
    isSyncing,
}) {
    // Convert categories to the format required by CustomDropdown
    const dropdownOptions = categories.map((cat) => ({
        label: cat.name,
        value: cat.id,
    }));

    return (
        <div className="flex items-center gap-2 border-b border-slate-700 pb-2 select-none">
            {/* MOBILE VIEW: Using CustomDropdown */}
            <div className="md:hidden flex-1">
                <CustomDropdown
                    options={dropdownOptions}
                    value={activeCategory}
                    onChange={(val) => setActiveCategory(val)}
                    placeholder="Select Category"
                />
            </div>

            {/* DESKTOP VIEW: Horizontal Slider (Tabs) */}
            <div className="hidden md:flex flex-1 gap-1.5 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                {categories.map((category, index) => {
                    const isSelected = activeCategory === category.id;
                    const dynamicColor =
                        colorPalette[index % colorPalette.length];

                    return (
                        <button
                            key={category.id}
                            type="button"
                            onClick={() => setActiveCategory(category.id)}
                            className={`px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all min-w-[110px] shrink-0 whitespace-nowrap text-center border-2 border-transparent shadow ${
                                isSelected
                                    ? "bg-slate-100 text-slate-950 scale-105 border-yellow-400 font-extrabold shadow-inner"
                                    : dynamicColor
                            }`}
                        >
                            {category.name}
                        </button>
                    );
                })}
            </div>

            {/* Refresh / Stock Sync Button */}
            <button
                type="button"
                disabled={isSyncing}
                onClick={refreshCatalog}
                className={`p-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center gap-1 shadow shrink-0 ${
                    isSyncing ? "animate-pulse opacity-60" : ""
                }`}
                title="Sync Database Catalog"
            >
                🔄{" "}
                <span className="hidden md:inline">
                    {isSyncing ? "Syncing..." : "Sync"}
                </span>
            </button>
        </div>
    );
}
