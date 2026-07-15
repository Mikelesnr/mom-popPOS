import React, { useState, useMemo } from "react";
import { X, Scale, Beaker, Zap } from "lucide-react";
import ShotCounter from "@/Utils/ShotCounter";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";

export default function SpiritWeightPopup({
    product,
    shopShotSizeMl,
    onApply,
    onClose,
}) {
    const [weight, setWeight] = useState("");

    const bottleSpecs = product.catalog_data?.bottle_specs;

    // Calculate suggestion using same logic as before
    const calculatedShots = useMemo(() => {
        if (!weight || parseFloat(weight) <= 0) return null;
        return ShotCounter.calculateEstimatedShotsFromWeight(
            weight,
            bottleSpecs,
            shopShotSizeMl,
        );
    }, [weight, bottleSpecs, shopShotSizeMl]);

    const handleApply = () => {
        if (calculatedShots !== null) {
            // Pass the calculated shot count back to the parent handler
            onApply(calculatedShots);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        <Scale className="text-blue-600" />
                        Weight Check: {product.name}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                        <div>
                            <span className="block text-gray-500">
                                Capacity
                            </span>
                            <span className="font-semibold">
                                {bottleSpecs?.capacity_ml} ml
                            </span>
                        </div>
                        <div>
                            <span className="block text-gray-500">
                                Shot Size
                            </span>
                            <span className="font-semibold">
                                {shopShotSizeMl} ml
                            </span>
                        </div>
                        <div>
                            <span className="block text-gray-500">
                                Empty Weight
                            </span>
                            <span className="font-semibold">
                                {bottleSpecs?.tare_weight_g} g
                            </span>
                        </div>
                        <div>
                            <span className="block text-gray-500">
                                Full Weight
                            </span>
                            <span className="font-semibold">
                                {bottleSpecs?.gross_weight_g} g
                            </span>
                        </div>
                    </div>

                    {/* Weight Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Enter Measured Weight (grams)
                        </label>
                        <div className="relative">
                            <Scale
                                className="absolute left-3 top-3 text-gray-400"
                                size={20}
                            />
                            <input
                                type="number"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                placeholder="e.g. 950.5"
                                step="0.1"
                                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Result Suggestion */}
                    {calculatedShots !== null && (
                        <div className="bg-blue-50 border-2 border-blue-200 p-5 rounded-xl text-center animate-in zoom-in duration-100">
                            <p className="text-sm text-blue-800 mb-1">
                                Calculated Contents
                            </p>
                            <p className="text-5xl font-extrabold text-blue-950">
                                {calculatedShots}{" "}
                                <span className="text-3xl font-bold text-blue-800">
                                    Shots
                                </span>
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                                (Based on density ratio, floored)
                            </p>
                        </div>
                    )}
                    {calculatedShots === null && weight > 0 && (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center text-red-700">
                            <AlertTriangle size={20} className="inline mr-2" />
                            Invalid weight or missing bottle specification data.
                        </div>
                    )}
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
                    <PrimaryButton
                        onClick={handleApply}
                        disabled={calculatedShots === null}
                        className="bg-blue-600 hover:bg-blue-700 px-6"
                    >
                        <Zap size={18} className="mr-2" />
                        Apply to Worksheet
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
}
