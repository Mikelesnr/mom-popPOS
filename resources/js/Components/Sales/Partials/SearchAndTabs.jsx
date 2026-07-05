import React from "react";

export default function SearchAndTabs({
    categories,
    activeCategory,
    setActiveCategory,
    colorPalette,
    refreshCatalog,
    isSyncing,
}) {
    return (
        <div className="flex items-center gap-2 border-b border-slate-700 pb-2 select-none">
            {/* Categories Taps View */}
            <div className="flex-1 flex gap-1.5 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                {categories.map((category, index) => {
                    const isSelected = activeCategory === category.id;
                    const dynamicColor =
                        colorPalette[index % colorPalette.length];

                    return (
                        <button
                            key={category.id}
                            type="button"
                            onClick={() => setActiveCategory(category.id)}
                            className={`px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all min-w-[110px] text-center border-2 border-transparent shadow ${
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
                🔄 {isSyncing ? "Syncing..." : "Sync"}
            </button>
        </div>
    );
}
