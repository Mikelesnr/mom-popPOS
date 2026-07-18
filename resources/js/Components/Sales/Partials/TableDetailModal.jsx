import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/Utils/db";
import CustomDropdown from "@/Components/Shared/CustomDropdown";

export default function TableDetailModal({ table, onClose }) {
    const [view, setView] = useState("actions"); // "actions", "transfer", "confirm"
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [actionType, setActionType] = useState(null); // 'void' or 'deferred'

    const users = useLiveQuery(() => db.users.toArray());

    const handleTransfer = async () => {
        if (!selectedUserId) return;
        await db.open_tables.update(table.id, { user_id: selectedUserId });
        onClose();
    };

    const handleConfirmAction = async () => {
        // Status values match your backend enum requirements
        const status = actionType === "void" ? "void" : "deferred";
        await db.open_tables.update(table.id, { status: status });
        onClose();
    };

    const userOptions =
        users?.map((u) => ({
            value: u.id,
            label: `${u.name} (${u.role})`,
        })) || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl">
                <h2 className="font-bold text-lg mb-4 text-center">
                    Table Management
                </h2>

                {/* Info Display */}
                <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100">
                    <p className="font-bold text-gray-900">{table.name}</p>
                    <p className="text-sm text-gray-600">
                        Staff: {table.staffName}
                    </p>
                    <p className="text-sm text-gray-600">
                        Total: ${parseFloat(table.total_amount || 0).toFixed(2)}
                    </p>
                </div>

                {view === "actions" && (
                    <div className="space-y-3">
                        <button
                            onClick={() => setView("transfer")}
                            className="w-full bg-amber-600 text-white p-3 rounded-lg font-bold"
                        >
                            Transfer Table
                        </button>
                        <button
                            onClick={() => {
                                setActionType("void");
                                setView("confirm");
                            }}
                            className="w-full bg-red-600 text-white p-3 rounded-lg font-bold"
                        >
                            Void Table
                        </button>
                        <button
                            onClick={() => {
                                setActionType("deferred");
                                setView("confirm");
                            }}
                            className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold"
                        >
                            Defer Table
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full mt-2 text-gray-500 font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {view === "transfer" && (
                    <div className="space-y-4">
                        <h3 className="font-bold text-center">
                            Select New Staff
                        </h3>
                        <CustomDropdown
                            options={userOptions}
                            value={selectedUserId}
                            onChange={setSelectedUserId}
                            placeholder="Select Staff..."
                        />
                        <button
                            onClick={handleTransfer}
                            className="w-full bg-emerald-600 text-white p-3 rounded-lg font-bold"
                        >
                            Confirm Transfer
                        </button>
                        <button
                            onClick={() => setView("actions")}
                            className="w-full text-gray-500 font-medium"
                        >
                            Back
                        </button>
                    </div>
                )}

                {view === "confirm" && (
                    <div className="space-y-4 text-center">
                        <p className="font-bold text-gray-800">
                            Are you sure you want to {actionType} this table?
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleConfirmAction}
                                className="flex-1 bg-red-600 text-white p-3 rounded-lg font-bold"
                            >
                                Confirm
                            </button>
                            <button
                                onClick={() => setView("actions")}
                                className="flex-1 bg-gray-200 p-3 rounded-lg font-bold"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
