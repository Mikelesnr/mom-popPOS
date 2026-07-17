import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function CustomDropdown({
    options,
    value,
    onChange,
    placeholder = "Select...",
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {/* Trigger Button: Added justify-center and larger text */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-center bg-white border border-gray-300 rounded-xl px-4 py-4 text-base font-semibold text-gray-800 hover:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all shadow-sm"
            >
                <span className="truncate mr-2">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* Dropdown Menu: Text also increased to text-base for consistency */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg py-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={`w-full text-center px-4 py-3.5 text-base transition-colors ${
                                value === option.value
                                    ? "bg-blue-50 text-blue-700 font-bold"
                                    : "text-gray-800 hover:bg-gray-50"
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
