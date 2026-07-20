import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/Utils/db";
import { X, Plus, Pencil, Trash2, Check, Loader2 } from "lucide-react";

const slugify = (name) =>
    name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

const titleCase = (name) =>
    name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ")
        .replace(
            /(^|\s)([a-z])/g,
            (_, boundary, letter) => boundary + letter.toUpperCase(),
        );

export default function CategoryManager({ open, onClose }) {
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState(null);

    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState("");
    const [savingId, setSavingId] = useState(null);
    const [editError, setEditError] = useState(null);

    const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [deleteError, setDeleteError] = useState(null);

    const currentShopId = localStorage.getItem("terminal_shop_id");

    const categories =
        useLiveQuery(async () => {
            return await db.categories
                .where("shop_id")
                .equals(currentShopId)
                .toArray();
        }, [currentShopId]) || [];

    if (!open) return null;

    const createCategory = async (e) => {
        e.preventDefault();
        const rawName = newName.trim();
        if (!rawName) return;
        const name = titleCase(rawName);

        setCreating(true);
        setCreateError(null);
        try {
            const res = await axios.post(route("inventory.categories.store"), {
                id: crypto.randomUUID(),
                name,
                slug: slugify(name),
            });
            await db.categories.put(res.data);
            setNewName("");
            toast.success(`"${res.data.name}" added.`);
        } catch (err) {
            const message =
                err?.response?.data?.message ||
                err?.response?.data?.errors?.name?.[0] ||
                "Could not create category.";
            setCreateError(message);
        } finally {
            setCreating(false);
        }
    };

    const startEdit = (cat) => {
        setEditingId(cat.id);
        setEditingName(cat.name);
        setEditError(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditError(null);
    };

    const saveEdit = async (id) => {
        const rawName = editingName.trim();
        if (!rawName) return;
        const name = titleCase(rawName);

        setSavingId(id);
        setEditError(null);
        try {
            const res = await axios.put(
                route("inventory.categories.update", id),
                { name, slug: slugify(name) },
            );
            await db.categories.put(res.data);
            setEditingId(null);
            toast.success("Category updated.");
        } catch (err) {
            const message =
                err?.response?.data?.message ||
                err?.response?.data?.errors?.name?.[0] ||
                "Could not update category.";
            setEditError(message);
        } finally {
            setSavingId(null);
        }
    };

    const deleteCategory = async (id) => {
        setDeletingId(id);
        setDeleteError(null);
        try {
            await axios.delete(route("inventory.categories.destroy", id));
            await db.categories.delete(id);
            toast.success("Category removed.");
            setConfirmingDeleteId(null);
        } catch (err) {
            const message =
                err?.response?.data?.message || "Could not remove category.";
            setDeleteError({ id, message });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col"
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">
                        Manage Categories
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form
                    onSubmit={createCategory}
                    className="p-4 border-b border-gray-100"
                >
                    <div className="flex gap-2">
                        <input
                            value={newName}
                            onChange={(e) => {
                                setNewName(e.target.value);
                                setCreateError(null);
                            }}
                            placeholder="New category name"
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        <button
                            type="submit"
                            disabled={creating || !newName.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg disabled:opacity-50 flex items-center justify-center shrink-0"
                        >
                            {creating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                    {createError && (
                        <p className="text-red-600 text-xs mt-1.5">
                            {createError}
                        </p>
                    )}
                </form>

                <div className="overflow-y-auto p-4 space-y-2">
                    {categories.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-6">
                            No categories yet. Add one above.
                        </p>
                    )}

                    {categories.map((cat) => (
                        <div key={cat.id}>
                            <div className="flex items-center justify-between gap-2 p-2.5 border border-gray-200 rounded-lg">
                                {editingId === cat.id ? (
                                    <input
                                        value={editingName}
                                        onChange={(e) => {
                                            setEditingName(e.target.value);
                                            setEditError(null);
                                        }}
                                        autoFocus
                                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                                    />
                                ) : (
                                    <span className="text-sm text-gray-800 truncate">
                                        {cat.name}
                                    </span>
                                )}

                                <div className="flex items-center gap-1 shrink-0">
                                    {editingId === cat.id ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={cancelEdit}
                                                className="p-1.5 text-gray-400 hover:text-gray-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => saveEdit(cat.id)}
                                                disabled={savingId === cat.id}
                                                className="p-1.5 text-emerald-600 hover:text-emerald-700"
                                            >
                                                {savingId === cat.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Check className="w-4 h-4" />
                                                )}
                                            </button>
                                        </>
                                    ) : confirmingDeleteId === cat.id ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setConfirmingDeleteId(null)
                                                }
                                                className="text-xs text-gray-500 px-2 py-1"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    deleteCategory(cat.id)
                                                }
                                                disabled={deletingId === cat.id}
                                                className="text-xs bg-red-600 text-white px-2 py-1 rounded disabled:opacity-50"
                                            >
                                                {deletingId === cat.id
                                                    ? "..."
                                                    : "Confirm"}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => startEdit(cat)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setConfirmingDeleteId(
                                                        cat.id,
                                                    )
                                                }
                                                className="p-1.5 text-gray-400 hover:text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {editingId === cat.id && editError && (
                                <p className="text-red-600 text-xs mt-1 ml-1">
                                    {editError}
                                </p>
                            )}
                            {deleteError?.id === cat.id && (
                                <p className="text-red-600 text-xs mt-1 ml-1">
                                    {deleteError.message}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
