"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ConversationItem, DialogueLine, Level } from "@/types";
import { Plus, Trash2, Edit3, ArrowLeft, Check, AlertCircle } from "lucide-react";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2"];

export default function AdminConversationsPage() {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    level: "A1" as Level,
    title: "",
    description: "",
    dialogue: [
      { speaker: "Person A", german: "", english: "", malayalam: "" },
      { speaker: "Person B", german: "", english: "", malayalam: "" },
    ] as DialogueLine[],
  });

  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/conversations-list")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setFormData({
      level: "A1",
      title: "",
      description: "",
      dialogue: [
        { speaker: "Person A", german: "", english: "", malayalam: "" },
        { speaker: "Person B", german: "", english: "", malayalam: "" },
      ],
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (conv: ConversationItem) => {
    setFormData({
      level: conv.level,
      title: conv.title,
      description: conv.description || "",
      dialogue: conv.dialogue && conv.dialogue.length > 0 ? conv.dialogue : [
        { speaker: "Person A", german: "", english: "", malayalam: "" },
      ],
    });
    setEditingId(conv.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this conversation?")) return;

    try {
      const res = await fetch(`/api/admin/conversations?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setStatusMsg({ type: "success", text: "Conversation deleted." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Failed to delete conversation." });
    }
  };

  const updateDialogueLine = (index: number, field: keyof DialogueLine, value: string) => {
    const updated = [...formData.dialogue];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, dialogue: updated });
  };

  const addDialogueLine = () => {
    setFormData({
      ...formData,
      dialogue: [
        ...formData.dialogue,
        { speaker: "Person " + String.fromCharCode(65 + (formData.dialogue.length % 2)), german: "", english: "", malayalam: "" },
      ],
    });
  };

  const removeDialogueLine = (index: number) => {
    if (formData.dialogue.length <= 1) return;
    setFormData({
      ...formData,
      dialogue: formData.dialogue.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const payload = {
      ...(editingId ? { id: editingId } : {}),
      ...formData,
    };

    try {
      const res = await fetch("/api/admin/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.item) {
        if (editingId) {
          setItems((prev) => prev.map((i) => (i.id === editingId ? data.item : i)));
          setStatusMsg({ type: "success", text: "Conversation updated!" });
        } else {
          setItems((prev) => [...prev, data.item]);
          setStatusMsg({ type: "success", text: "New conversation created!" });
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
      <div className="border-b-2 border-black pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-xs font-bold uppercase text-neutral-500 hover:text-black flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight mt-1">
            Manage German Conversations
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
          <span>{showForm ? "Cancel" : "Add Conversation"}</span>
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
          {statusMsg.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border-2 border-black bg-white p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-4"
        >
          <h2 className="text-lg font-black uppercase text-black border-b border-black pb-2">
            {editingId ? "Edit Conversation" : "Add New Conversation"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">Level</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as Level })}
                className="w-full px-3 py-2 border-2 border-black bg-white text-sm font-bold"
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">Conversation Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Im Restaurant bestellen"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black text-sm font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">Context / Setting</label>
            <input
              type="text"
              placeholder="e.g. Ordering lunch and asking for the bill"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black text-sm"
            />
          </div>

          {/* Dialogue Lines Builder */}
          <div className="pt-4 border-t border-neutral-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-black">
                Dialogue Lines (Trilingual)
              </h3>
              <button
                type="button"
                onClick={addDialogueLine}
                className="text-xs font-bold px-2 py-1 bg-black text-white hover:bg-neutral-800"
              >
                + Add Line
              </button>
            </div>

            {formData.dialogue.map((line, idx) => (
              <div key={idx} className="border border-neutral-300 p-3 bg-neutral-50 space-y-2">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    placeholder="Speaker (e.g. Thomas)"
                    value={line.speaker}
                    onChange={(e) => updateDialogueLine(idx, "speaker", e.target.value)}
                    className="w-36 px-2 py-1 border border-black text-xs font-bold uppercase"
                  />
                  {formData.dialogue.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDialogueLine(idx)}
                      className="text-neutral-500 hover:text-red-600 text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="German line"
                    value={line.german}
                    onChange={(e) => updateDialogueLine(idx, "german", e.target.value)}
                    className="px-2 py-1.5 border border-black text-xs font-bold"
                  />
                  <input
                    type="text"
                    required
                    placeholder="English translation"
                    value={line.english}
                    onChange={(e) => updateDialogueLine(idx, "english", e.target.value)}
                    className="px-2 py-1.5 border border-neutral-400 text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Malayalam translation (മലയാളം)"
                    value={line.malayalam}
                    onChange={(e) => updateDialogueLine(idx, "malayalam", e.target.value)}
                    className="px-2 py-1.5 border border-[#facc15] text-xs font-malayalam"
                  />
                </div>
              </div>
            ))}
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
              {editingId ? "Update Conversation" : "Save Conversation"}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-xs text-neutral-500">Loading conversations...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12 border border-neutral-200 bg-neutral-50 p-6">
            <p className="text-neutral-600 text-sm">No conversations found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((conv) => (
              <div
                key={conv.id}
                className="border-2 border-black bg-white p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-xs font-black bg-[#ffe600] border border-black text-black">
                      {conv.level}
                    </span>
                    <h3 className="text-base font-black text-black">{conv.title}</h3>
                  </div>
                  {conv.description && (
                    <p className="text-xs text-neutral-600 mb-2">{conv.description}</p>
                  )}
                  <p className="text-xs font-bold text-neutral-500">
                    {conv.dialogue?.length || 0} dialogue lines
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(conv)}
                    className="p-1.5 border border-black hover:bg-[#ffe600] transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-black" />
                  </button>
                  <button
                    onClick={() => handleDelete(conv.id)}
                    className="p-1.5 border border-black hover:bg-red-500 hover:text-white transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}