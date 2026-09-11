"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { VocabularyItem, Level, Category } from "@/types";
import { Plus, Trash2, Edit3, ArrowLeft, Check, AlertCircle } from "lucide-react";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2"];
const CATEGORIES: Category[] = [
  "Vocabulary",
  "Grammar",
  "Speaking",
  "Reading",
  "Writing",
  "Listening",
];

export default function AdminVocabularyPage() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    level: "A1" as Level,
    category: "Vocabulary" as Category,
    title: "",
    german_content: "",
    english_meaning: "",
    malayalam_meaning: "",
    content: "",
  });

  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load items
  useEffect(() => {
    fetch("/api/admin/vocabulary-list")
      .then((res) => {
        if (!res.ok) throw new Error("Could not fetch");
        return res.json();
      })
      .then((data) => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(() => {
        // Fallback default
        setLoading(false);
      });
  }, []);

  const resetForm = () => {
    setFormData({
      level: "A1",
      category: "Vocabulary",
      title: "",
      german_content: "",
      english_meaning: "",
      malayalam_meaning: "",
      content: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item: VocabularyItem) => {
    setFormData({
      level: item.level,
      category: item.category,
      title: item.title,
      german_content: item.german_content,
      english_meaning: item.english_meaning,
      malayalam_meaning: item.malayalam_meaning,
      content: item.content || "",
    });
    setEditingId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this word?")) return;

    try {
      const res = await fetch(`/api/admin/vocabulary?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setStatusMsg({ type: "success", text: "Word deleted successfully." });
      } else {
        throw new Error("Failed to delete");
      }
    } catch {
      setStatusMsg({ type: "error", text: "Could not delete word." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const payload = {
      ...(editingId ? { id: editingId } : {}),
      ...formData,
    };

    try {
      const res = await fetch("/api/admin/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.item) {
        if (editingId) {
          setItems((prev) => prev.map((i) => (i.id === editingId ? data.item : i)));
          setStatusMsg({ type: "success", text: "Word updated successfully!" });
        } else {
          setItems((prev) => [data.item, ...prev]);
          setStatusMsg({ type: "success", text: "New word added successfully!" });
        }
        resetForm();
      } else {
        throw new Error(data.error || "Failed to save");
      }
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-bold uppercase text-neutral-500 hover:text-black flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight mt-1">
            Manage Vocabulary & Words
          </h1>
        </div>

        <button
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black bg-[#ffe600] text-black font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? "Cancel" : "Add New Word"}</span>
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-3 text-xs font-bold border flex items-center gap-2 ${
            statusMsg.type === "success"
              ? "bg-green-50 border-green-600 text-green-900"
              : "bg-red-50 border-red-600 text-red-900"
          }`}
        >
          {statusMsg.type === "success" ? (
            <Check className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Form (Add / Edit) */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border-2 border-black bg-white p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-4"
        >
          <h2 className="text-lg font-black uppercase text-black border-b border-black pb-2">
            {editingId ? "Edit Word / Lesson" : "Add New Word / Lesson"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                Level
              </label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as Level })}
                className="w-full px-3 py-2 border-2 border-black bg-white text-sm font-bold"
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
                className="w-full px-3 py-2 border-2 border-black bg-white text-sm font-bold"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
              Title / Heading
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Guten Morgen (Greetings)"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                German Phrase / Word
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Guten Morgen"
                value={formData.german_content}
                onChange={(e) => setFormData({ ...formData, german_content: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                English Meaning
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Good Morning"
                value={formData.english_meaning}
                onChange={(e) => setFormData({ ...formData, english_meaning: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                Malayalam Meaning (മലയാളം)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. സുപ്രഭാതം"
                value={formData.malayalam_meaning}
                onChange={(e) => setFormData({ ...formData, malayalam_meaning: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black text-sm font-malayalam"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
              Detailed Notes / Explanation (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Additional explanation or context..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-black text-xs font-bold uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 border-2 border-black bg-[#ffe600] text-black text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all cursor-pointer"
            >
              {editingId ? "Update Word" : "Save Word"}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-black">
            Existing Vocabulary & Lessons ({items.length})
          </h2>
        </div>

        {loading ? (
          <p className="text-xs text-neutral-500">Loading words...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12 border border-neutral-200 bg-neutral-50 p-6">
            <p className="text-neutral-600 text-sm">No words found. Add your first word above!</p>
          </div>
        ) : (
          <div className="border-2 border-black bg-white overflow-x-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-black text-white uppercase text-[11px] font-black">
                <tr>
                  <th className="p-3 border-r border-neutral-700">Level</th>
                  <th className="p-3 border-r border-neutral-700">Category</th>
                  <th className="p-3 border-r border-neutral-700">German</th>
                  <th className="p-3 border-r border-neutral-700">English</th>
                  <th className="p-3 border-r border-neutral-700">Malayalam</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="p-3 font-black border-r border-neutral-200">
                      <span className="px-2 py-0.5 bg-[#ffe600] border border-black text-black">
                        {item.level}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-neutral-600 border-r border-neutral-200">
                      {item.category}
                    </td>
                    <td className="p-3 font-bold text-black border-r border-neutral-200">
                      {item.german_content}
                    </td>
                    <td className="p-3 text-neutral-700 border-r border-neutral-200">
                      {item.english_meaning}
                    </td>
                    <td className="p-3 text-neutral-900 font-malayalam border-r border-neutral-200">
                      {item.malayalam_meaning}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 border border-black hover:bg-[#ffe600] transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-black" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 border border-black hover:bg-red-500 hover:text-white transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}